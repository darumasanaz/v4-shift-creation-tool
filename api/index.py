from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/api/hello")
async def read_hello() -> JSONResponse:
    """Return a simple greeting payload for health checks."""
    return JSONResponse({"message": "Hello from FastAPI!"})
