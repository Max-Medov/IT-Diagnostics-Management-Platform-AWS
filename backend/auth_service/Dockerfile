FROM python:3.8-slim

WORKDIR /app

COPY auth_service/requirements.txt .

RUN pip install -r requirements.txt

COPY common /app/common

COPY auth_service /app

EXPOSE 5000

CMD ["python", "app.py"]


