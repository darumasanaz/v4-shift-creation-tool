"""FastAPI application that serves initial data for the shift tool."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse


app = FastAPI()


@app.get("/api/initial-data")
async def get_initial_data() -> JSONResponse:
    """Return the contents of ``input_data.json`` as a JSON response."""

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

    return JSONResponse(payload)
