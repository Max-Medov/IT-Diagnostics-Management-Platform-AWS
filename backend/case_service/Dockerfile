
FROM python:3.8-slim

WORKDIR /app

COPY case_service/requirements.txt .
RUN pip install -r requirements.txt

COPY common /app/common
COPY case_service /app

CMD ["python", "app.py"]

