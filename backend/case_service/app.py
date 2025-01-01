from flask import Flask, request, jsonify
from flask_migrate import Migrate
from common.models import db, Case, User, CaseComment
from common.config import Config
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
from tenacity import retry, stop_after_attempt, wait_fixed
import os
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config.from_object(Config)
app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key')
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

initialize_database()

@app.route('/cases', methods=['GET', 'POST'])
@jwt_required()
def cases():
    if request.method == 'POST':
        try:
            data = request.get_json()
            description = data.get('description')
            platform = data.get('platform')

            if not description or not platform:
                return jsonify({'message': 'Description and platform are required.'}), 400

            user_id = get_jwt_identity()
            new_case = Case(description=description, platform=platform, user_id=user_id)
            db.session.add(new_case)
            db.session.commit()

            return jsonify({'message': 'Case created successfully.', 'case_id': new_case.id}), 201
        except Exception as e:
            app.logger.error(f"Exception in /cases POST: {e}")
            return jsonify({'message': 'Internal server error'}), 500
    elif request.method == 'GET':
        try:
            user_id = get_jwt_identity()
            user_cases = Case.query.filter_by(user_id=user_id).all()
            cases_list = [{
                'id': case.id,
                'description': case.description,
                'platform': case.platform,
                'analysis': case.analysis
            } for case in user_cases]

            return jsonify(cases_list), 200
        except Exception as e:
            app.logger.error(f"Exception in /cases GET: {e}")
            return jsonify({'message': 'Internal server error'}), 500

@app.route('/cases/<int:case_id>', methods=['GET'])
@jwt_required()
def get_case(case_id):
    try:
        user_id = get_jwt_identity()
        case = Case.query.get_or_404(case_id)
        claims = get_jwt()
        if case.user_id != user_id and not claims.get("is_admin", False):
            return jsonify({'message': 'Access denied.'}), 403

        case_data = {
            'id': case.id,
            'description': case.description,
            'platform': case.platform,
            'analysis': case.analysis,
            'analysis_data': case.analysis_data,
            'suggestions': case.suggestions
        }

        return jsonify(case_data), 200
    except Exception as e:
        app.logger.error(f"Exception in /cases/{case_id}: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/admin/cases', methods=['GET'])
@jwt_required()
def admin_all_cases():
    try:
        claims = get_jwt()
        if not claims.get("is_admin", False):
            return jsonify({'message': 'Admin only.'}), 403

        all_cases = Case.query.all()
        cases_list = [{
            'id': c.id,
            'description': c.description,
            'platform': c.platform,
            'analysis': c.analysis,
            'analysis_data': c.analysis_data,
            'suggestions': c.suggestions,
            'username': c.user.username
        } for c in all_cases]

        return jsonify(cases_list), 200
    except Exception as e:
        app.logger.error(f"Exception in /admin/cases GET: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/cases/<int:case_id>/comments', methods=['GET', 'POST'])
@jwt_required()
def case_comments(case_id):
    try:
        user_id = get_jwt_identity()
        case = Case.query.get_or_404(case_id)
        claims = get_jwt()
        # Admin or owner can view and comment
        if case.user_id != user_id and not claims.get("is_admin", False):
            return jsonify({'message': 'Access denied.'}), 403

        if request.method == 'GET':
            # List comments
            comments = CaseComment.query.filter_by(case_id=case_id).order_by(CaseComment.timestamp.asc()).all()
            comments_list = [{
                'id': c.id,
                'user': c.user.username,
                'is_admin': c.user.is_admin,
                'comment': c.comment,
                'timestamp': c.timestamp.isoformat()
            } for c in comments]
            return jsonify(comments_list), 200
        elif request.method == 'POST':
            # Add a new comment
            data = request.get_json()
            comment_text = data.get('comment')
            if not comment_text:
                return jsonify({'message': 'Comment is required.'}), 400

            new_comment = CaseComment(case_id=case_id, user_id=user_id, comment=comment_text)
            db.session.add(new_comment)
            db.session.commit()
            return jsonify({'message': 'Comment added successfully.'}), 201
    except Exception as e:
        app.logger.error(f"Exception in /cases/{case_id}/comments: {e}")
        return jsonify({'message': 'Internal server error'}), 500
        
@app.route('/metrics')
def metrics():
    return metrics.generate_latest(), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)

