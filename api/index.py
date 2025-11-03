"""FastAPI application that serves initial data for the shift tool and
generates schedules using OR-Tools."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from ortools.sat.python import cp_model


WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"]

app = FastAPI()


def _load_initial_payload() -> Dict[str, Any]:
    data_file = Path(__file__).with_name("input_data.json")

    try:
        with data_file.open("r", encoding="utf-8") as file_pointer:
            payload = json.load(file_pointer)
    except FileNotFoundError as exc:  # pragma: no cover - dependent on deployment
        raise HTTPException(
            status_code=500, detail="input_data.json file not found."
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500, detail="input_data.json contains invalid JSON."
        ) from exc
    except OSError as exc:  # pragma: no cover - dependent on deployment
        raise HTTPException(
            status_code=500, detail="Unable to read input_data.json."
        ) from exc

    return payload


@app.get("/api/initial-data")
async def get_initial_data() -> JSONResponse:
    """Return the contents of ``input_data.json`` as a JSON response."""

    payload = _load_initial_payload()
    return JSONResponse(payload)


def _weekday_name(weekday_of_day1: int, day_index: int) -> str:
    """Return the weekday label for the given day index (0-based)."""

    return WEEKDAY_LABELS[(weekday_of_day1 + day_index) % len(WEEKDAY_LABELS)]


def _as_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _prepare_wish_offs(raw_wish_offs: Mapping[str, Iterable[int]] | None) -> Dict[str, set[int]]:
    prepared: Dict[str, set[int]] = {}
    if not raw_wish_offs:
        return prepared

    for staff_id, days in raw_wish_offs.items():
        valid_days = {
            int(day)
            for day in days
            if isinstance(day, (int, float)) and int(day) == day and int(day) > 0
        }
        prepared[str(staff_id)] = set(valid_days)
    return prepared


def _solve_shift_problem(payload: Mapping[str, Any]) -> Dict[str, Dict[str, List[str]]]:
    if not isinstance(payload, Mapping):
        raise ValueError("Payload must be a JSON object")

    days = _as_int(payload.get("days"), 0)
    if days <= 0:
        raise ValueError("days must be a positive integer")

    shifts: List[Mapping[str, Any]] = list(payload.get("shifts", []))
    people: List[Mapping[str, Any]] = list(payload.get("people", []))
    if not shifts:
        raise ValueError("shifts must be provided")
    if not people:
        raise ValueError("people must be provided")

    weekday_of_day1 = _as_int(payload.get("weekdayOfDay1"), 0)
    wish_offs = _prepare_wish_offs(payload.get("wishOffs"))

    night_rest_rules: Mapping[str, int] = {}
    raw_rules = payload.get("rules")
    if isinstance(raw_rules, Mapping):
        possible_rule = raw_rules.get("nightRest", {})
        if isinstance(possible_rule, Mapping):
            night_rest_rules = possible_rule

    model = cp_model.CpModel()

    # Decision variables
    assignment: Dict[tuple[int, int, str], cp_model.IntVar] = {}
    works: Dict[tuple[int, int], cp_model.IntVar] = {}
    per_person_day: Dict[tuple[int, int], List[cp_model.IntVar]] = {}

    for person_index in range(len(people)):
        for day in range(days):
            per_person_day[(person_index, day)] = []
            works[(person_index, day)] = model.NewBoolVar(
                f"work_{person_index}_{day}"
            )

    for day in range(days):
        weekday_label = _weekday_name(weekday_of_day1, day)
        for shift in shifts:
            shift_code = str(shift.get("code"))
            candidates: List[cp_model.IntVar] = []
            for person_index, person in enumerate(people):
                person_id = str(person.get("id"))
                can_work = set(person.get("canWork", []))
                fixed_off_weekdays = set(person.get("fixedOffWeekdays", []))
                requested_off_days = wish_offs.get(person_id, set())

                if shift_code not in can_work:
                    continue
                if weekday_label in fixed_off_weekdays:
                    continue
                if (day + 1) in requested_off_days:
                    continue

                variable = model.NewBoolVar(
                    f"assign_{person_index}_{day}_{shift_code}"
                )
                assignment[(person_index, day, shift_code)] = variable
                candidates.append(variable)
                per_person_day[(person_index, day)].append(variable)

            if not candidates:
                raise ValueError(
                    f"No available staff for day {day + 1} and shift {shift_code}"
                )

            model.Add(sum(candidates) == 1)

    # One shift per day per person and link to works variables
    for (person_index, day), vars_for_day in per_person_day.items():
        model.Add(sum(vars_for_day) <= 1)
        if vars_for_day:
            model.Add(sum(vars_for_day) == works[(person_index, day)])
        else:
            model.Add(works[(person_index, day)] == 0)

    # Monthly min/max constraints and consecutive limits
    for person_index, person in enumerate(people):
        person_id = str(person.get("id"))
        monthly_min = max(0, _as_int(person.get("monthlyMin"), 0))
        monthly_max = _as_int(person.get("monthlyMax"), days)
        if monthly_max < monthly_min:
            raise ValueError(
                f"monthlyMax must be greater than or equal to monthlyMin for {person_id}"
            )
        consec_max = person.get("consecMax")
        day_vars = [works[(person_index, day)] for day in range(days)]

        model.Add(sum(day_vars) >= monthly_min)
        model.Add(sum(day_vars) <= monthly_max)

        if isinstance(consec_max, int) and consec_max > 0:
            window = consec_max + 1
            for start in range(0, max(0, days - window + 1)):
                model.Add(sum(day_vars[start : start + window]) <= consec_max)

    # Night rest constraints
    if isinstance(night_rest_rules, Mapping):
        for (person_index, day, shift_code), var in assignment.items():
            rest_days = night_rest_rules.get(shift_code)
            if isinstance(rest_days, int) and rest_days > 0:
                for offset in range(1, rest_days + 1):
                    future_day = day + offset
                    if future_day < days:
                        model.Add(var + works[(person_index, future_day)] <= 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("解決可能なシフトが見つかりませんでした。")

    result: Dict[str, Dict[str, List[str]]] = {}
    for day in range(days):
        day_key = str(day + 1)
        result[day_key] = {}
        for shift in shifts:
            shift_code = str(shift.get("code"))
            assigned_staff: List[str] = []
            for person_index, person in enumerate(people):
                variable = assignment.get((person_index, day, shift_code))
                if variable is not None and solver.BooleanValue(variable):
                    assigned_staff.append(str(person.get("id")))
            result[day_key][shift_code] = assigned_staff

    return result


@app.post("/api/generate-shift")
async def generate_shift(request: Request) -> JSONResponse:
    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    try:
        schedule = _solve_shift_problem(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        return JSONResponse(
            {"status": "error", "message": str(exc)}, status_code=200
        )

    return JSONResponse({"status": "success", "shifts": schedule})
