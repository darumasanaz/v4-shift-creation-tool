from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Set
import json
import os

from ortools.sat.python import cp_model

app = FastAPI()

# フロントエンドからPOSTされるデータ構造を定義
class ShiftInput(BaseModel):
    year: int
    month: int
    days: int
    weekdayOfDay1: int
    # ... 他の全てもここに定義する必要がありますが、
    # 簡単にするために辞書(dict)として受け取ります
    previousMonthNightCarry: dict
    shifts: list
    needTemplate: dict
    dayTypeByDate: list
    strictNight: dict
    people: list
    rules: dict
    weights: dict | None = None
    wishOffs: dict

    class Config:
        extra = "allow"

@app.get("/api/initial-data")
def get_initial_data():
    """
    【検証用】input_data.jsonを読み込んで返す、以前の正常な処理。
    """
    try:
        # __file__ は現在のファイルパス, os.path.dirnameでディレクトリを取得
        dir_path = os.path.dirname(os.path.realpath(__file__))
        file_path = os.path.join(dir_path, 'input_data.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="input_data.jsonが見つかりません。")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"サーバーエラー: {str(e)}")

def _build_solver(data: Dict) -> tuple[cp_model.CpModel, Dict]:
    model = cp_model.CpModel()

    days: int = data["days"]
    shift_codes: List[str] = [shift["code"] for shift in data["shifts"]]
    people: List[Dict] = data["people"]
    first_weekday: int = data.get("weekdayOfDay1", 0) % 7

    weekday_map = {"日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6}

    wish_offs: Dict[str, Set[int]] = {
        staff_id: set(days_list) for staff_id, days_list in data.get("wishOffs", {}).items()
    }

    # 変数定義
    assignments: Dict[tuple[int, str, int], cp_model.IntVar] = {}
    works_day: Dict[tuple[int, int], cp_model.IntVar] = {}

    for person_index, person in enumerate(people):
        person_id = person["id"]
        can_work = set(person.get("canWork", []))
        fixed_off_days = {
            weekday_map[label]
            for label in person.get("fixedOffWeekdays", [])
            if label in weekday_map
        }
        wish_days = wish_offs.get(person_id, set())

        for day in range(days):
            weekday = (first_weekday + day) % 7
            works_day[(day, person_index)] = model.NewBoolVar(
                f"work_d{day}_p{person_index}"
            )

            for shift_code in shift_codes:
                var = model.NewBoolVar(f"x_d{day}_s{shift_code}_p{person_index}")
                assignments[(day, shift_code, person_index)] = var

                # 勤務不可の条件は変数を0に固定
                if (
                    shift_code not in can_work
                    or weekday in fixed_off_days
                    or (day + 1) in wish_days
                ):
                    model.Add(var == 0)

            # 1日の勤務は高々1回
            model.Add(
                sum(
                    assignments[(day, shift_code, person_index)]
                    for shift_code in shift_codes
                )
                == works_day[(day, person_index)]
            )

    # 各シフトに1人割り当て
    for day in range(days):
        for shift_code in shift_codes:
            model.Add(
                sum(
                    assignments[(day, shift_code, person_index)]
                    for person_index in range(len(people))
                )
                == 1
            )

    # 月間勤務日数制約
    for person_index, person in enumerate(people):
        total_work = sum(
            works_day[(day, person_index)] for day in range(days)
        )
        monthly_min = person.get("monthlyMin")
        monthly_max = person.get("monthlyMax")
        if monthly_min is not None:
            model.Add(total_work >= int(monthly_min))
        if monthly_max is not None:
            model.Add(total_work <= int(monthly_max))

    # 最大連続勤務日数制約
    for person_index, person in enumerate(people):
        consec_max = person.get("consecMax")
        if not consec_max:
            continue
        window = consec_max + 1
        if window <= 1:
            continue
        for start in range(0, max(0, days - consec_max)):
            model.Add(
                sum(
                    works_day[(day, person_index)]
                    for day in range(start, start + window)
                )
                <= consec_max
            )

    # 夜勤後休み制約
    night_rest_rules = data.get("rules", {}).get("nightRest", {}) or {}
    for day in range(days):
        for shift_code, rest_days in night_rest_rules.items():
            if rest_days is None:
                continue
            rest_days_int = int(rest_days)
            if rest_days_int <= 0:
                continue
            for person_index in range(len(people)):
                if (day, shift_code, person_index) not in assignments:
                    continue
                for offset in range(1, rest_days_int + 1):
                    if day + offset >= days:
                        break
                    model.Add(
                        assignments[(day, shift_code, person_index)]
                        + works_day[(day + offset, person_index)]
                        <= 1
                    )

    return model, {
        "assignments": assignments,
        "works_day": works_day,
        "people": people,
        "shift_codes": shift_codes,
        "days": days,
    }


def _solve_shift(data: Dict) -> Dict:
    model, context = _build_solver(data)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30

    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "error",
            "message": "解決可能なシフトが見つかりませんでした。",
        }

    assignments = context["assignments"]
    people = context["people"]
    shift_codes = context["shift_codes"]
    days = context["days"]

    result: Dict[str, Dict[str, List[str]]] = {}
    for day in range(days):
        day_key = str(day + 1)
        result[day_key] = {}
        for shift_code in shift_codes:
            staff_for_shift = [
                people[person_index]["id"]
                for person_index in range(len(people))
                if solver.Value(assignments[(day, shift_code, person_index)]) == 1
            ]
            result[day_key][shift_code] = staff_for_shift

    return {"status": "success", "shifts": result}


@app.post("/api/generate-shift")
def generate_shift(shift_input: ShiftInput):
    try:
        return _solve_shift(shift_input.dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"サーバーエラー: {exc}")

# VercelがFastAPIアプリを認識するために必要
# このファイルがメインのエントリーポイントであることを示す
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
