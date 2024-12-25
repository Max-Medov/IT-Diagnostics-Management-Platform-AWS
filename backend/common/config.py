import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your_secret_key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://postgres:yourpassword@localhost:5432/postgres')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
