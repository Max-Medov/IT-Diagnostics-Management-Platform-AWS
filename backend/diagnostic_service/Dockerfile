FROM python:3.8-slim

WORKDIR /app

COPY diagnostic_service/requirements.txt .
RUN pip install -r requirements.txt

COPY common /app/common
COPY diagnostic_service /app

COPY scripts /app/scripts

RUN mkdir -p /app/uploads

CMD ["python", "app.py"]

