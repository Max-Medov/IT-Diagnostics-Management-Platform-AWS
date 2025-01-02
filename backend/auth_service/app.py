from flask import Flask, request, jsonify
from flask_migrate import Migrate
from common.models import db, User
from common.config import Config
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from tenacity import retry, stop_after_attempt, wait_fixed
from werkzeug.security import generate_password_hash, check_password_hash
from prometheus_flask_exporter import PrometheusMetrics
import os
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config.from_object(Config)
app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key')
# Allow CORS from specific origin
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)

metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.3')


@retry(stop=stop_after_attempt(5), wait=wait_fixed(5))
def initialize_database():
    with app.app_context():
        db.create_all()
        # If no users exist, create admin:admin user
        if User.query.count() == 0:
            admin_password_hash = generate_password_hash("admin")
            default_admin = User(username="admin", password_hash=admin_password_hash, is_admin=True)
            db.session.add(default_admin)
            db.session.commit()

initialize_database()

# Health Check
@app.route('/', methods=['GET'])
def root_index():
    return "OK", 200

@app.route('/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'message': 'Username and password are required.'}), 400

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'message': 'User already exists.'}), 409

        password_hash = generate_password_hash(password)
        new_user = User(username=username, password_hash=password_hash, is_admin=False)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': 'User registered successfully.'}), 201

    except Exception as e:
        app.logger.error(f"Exception in /register: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'message': 'Username and password are required.'}), 400

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'message': 'Invalid username or password.'}), 401

        # Check if admin must change default password
        password_change_required = False
        if user.is_admin and check_password_hash(user.password_hash, 'admin'):
            password_change_required = True

        access_token = create_access_token(identity=user.id, additional_claims={"is_admin": user.is_admin})
        return jsonify({'access_token': access_token, 'password_change_required': password_change_required}), 200

    except Exception as e:
        app.logger.error(f"Exception in /login: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/change_password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        data = request.get_json()
        new_password = data.get('new_password')
        if not new_password:
            return jsonify({'message': 'new_password required.'}), 400

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()

        return jsonify({'message': 'Password changed successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Exception in /change_password: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/change_username', methods=['POST'])
@jwt_required()
def change_username():
    try:
        claims = get_jwt()
        if not claims.get("is_admin", False):
            return jsonify({'message': 'Admin only.'}), 403

        data = request.get_json()
        new_username = data.get('new_username')
        if not new_username:
            return jsonify({'message': 'new_username required.'}), 400

        existing_user = User.query.filter_by(username=new_username).first()
        if existing_user:
            return jsonify({'message': 'Username already exists.'}), 409

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        user.username = new_username
        db.session.commit()

        return jsonify({'message': 'Username changed successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Exception in /change_username: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/admin/create_admin_user', methods=['POST'])
@jwt_required()
def create_admin_user():
    try:
        claims = get_jwt()
        if not claims.get("is_admin", False):
            return jsonify({'message': 'Admin only.'}), 403

        data = request.get_json()
        new_username = data.get('username')
        new_password = data.get('password')
        if not new_username or not new_password:
            return jsonify({'message': 'Username and password required.'}), 400

        if User.query.filter_by(username=new_username).first():
            return jsonify({'message': 'User already exists.'}), 409

        new_user = User(username=new_username, password_hash=generate_password_hash(new_password), is_admin=True)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'Admin user created successfully.'}), 201
    except Exception as e:
        app.logger.error(f"Exception in /admin/create_admin_user: {e}")
        return jsonify({'message': 'Internal server error'}), 500
        
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight request handled'})
        response.headers.add("Access-Control-Allow-Origin", "http://frontend.local")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        return response, 200
        
@app.route('/metrics')
def metrics():
    return metrics.generate_latest(), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

