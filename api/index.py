from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os

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
    weights: dict
    wishOffs: dict

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

@app.post("/api/generate-shift")
def generate_shift_mock(shift_input: ShiftInput):
    """
    【検証用】OR-Toolsを呼び出さずに、必ず成功を返すダミーの処理。
    """
    # ここでは計算をせず、ただ受け取ったことを確認してダミーの成功レスポンスを返す
    return {
        "status": "success (mock)",
        "message": "APIは正常に呼び出されましたが、計算は行っていません。",
        "shifts": {} # 空のシフトを返す
    }

# VercelがFastAPIアプリを認識するために必要
# このファイルがメインのエントリーポイントであることを示す
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
