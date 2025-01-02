import os
import logging
import json
import time

from flask import Flask, request, jsonify, make_response
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token, get_jwt
from flask_cors import CORS
from tenacity import retry, stop_after_attempt, wait_fixed
from prometheus_flask_exporter import PrometheusMetrics
from common.models import db, Case, User
from common.config import Config
from scripts.generate_diagnostic_script import generate_diagnostic_script

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config.from_object(Config)
app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key')
app.config['UPLOAD_FOLDER'] = '/app/uploads'

CORS(app, resources={r"/*": {"origins": "*"}})

db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)

metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.3')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@retry(stop=stop_after_attempt(5), wait=wait_fixed(5))
def initialize_database():
    with app.app_context():
        db.create_all()

initialize_database()

def analyze_results(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        suggestions = {}
        analysis_data = data

        ping_results = data.get('ping_test', [])
        dns_results = data.get('dns_resolution', [])
        tracepath_results = data.get('tracepath', [])
        pending_updates = data.get('pending_updates', [])
        swap_usage = data.get('swap_usage', [])
        network_connections = data.get('network_connections', [])
        cpu_usage = data.get('cpu_usage', [])
        memory_usage = data.get('memory_usage', [])
        load_average = data.get('load_average', [])
        vpn_status = data.get('vpn_status', [])

        # Default analysis message
        analysis = "Analysis completed. See suggestions below if any."

        # Ping Test
        packet_loss = 0
        ping_issue = False
        for line in ping_results:
            if "packet loss" in line:
                parts = line.split(",")
                if len(parts) >= 3:
                    loss_str = parts[2].strip()
                    loss_percentage = loss_str.split()[0].replace('%', '')
                    try:
                        packet_loss = float(loss_percentage)
                        if packet_loss > 0:
                            ping_issue = True
                    except ValueError:
                        pass
                break

        if ping_issue:
            severity = "moderate"
            if packet_loss > 50:
                severity = "high"
            suggestions['ping_test'] = [
                f"Ping Test: This test checks connectivity and packet loss to a known host. {severity.capitalize()} packet loss detected.",
                "Check physical network connections and ensure interfaces are up.",
                "Verify default gateway and routing configuration.",
                "Consider traceroute/tracepath to identify where packets are lost.",
                "Review firewall rules that might drop ICMP.",
                "Investigate network congestion or bandwidth issues."
            ]

        # DNS Resolution
        dns_failure = any("can't resolve" in line.lower() or "server can't find" in line.lower() for line in dns_results)
        if dns_failure:
            suggestions['dns_resolution'] = [
                "DNS Resolution: This test checks if the system can resolve domain names.",
                "Verify /etc/resolv.conf and DNS server configurations.",
                "Try alternative DNS servers (e.g., 8.8.8.8) to isolate the issue.",
                "Check firewall rules that may block DNS queries.",
                "Use `dig` or `host` for detailed DNS diagnostics.",
                "Confirm the domain's existence and spelling."
            ]
            if ping_issue and packet_loss == 100:
                suggestions['dns_resolution'].append(
                    "If pinging by IP works but domains fail, focus on DNS configuration."
                )

        # Tracepath
        tracepath_failure = any("unreachable" in line.lower() or "failed" in line.lower() for line in tracepath_results)
        if tracepath_failure:
            suggestions['tracepath'] = [
                "Tracepath: This test examines the route packets take to a remote host.",
                "Identify the hop where tracepath fails and check that segment.",
                "Verify gateway and routing configurations.",
                "Examine firewalls or ACLs that may block traceroute packets.",
                "Ensure the target host is online and not blocking probes.",
                "Try MTR or traceroute with different protocols for more insight."
            ]

        # Network Connections
        if network_connections and any("tcp" in line and not (":22 " in line or ":80 " in line or ":443 " in line)
                                       for line in network_connections):
            suggestions['network_connections'] = [
                "Network Connections: This test lists open ports and connections on the system.",
                "Review services running on non-standard ports to ensure they're authorized.",
                "Implement firewall rules to restrict unnecessary open ports.",
                "Monitor traffic on unusual ports for potential intrusions.",
                "Document all expected services/ports for a known baseline."
            ]

        # Pending Updates
        if pending_updates and len(pending_updates) > 1:
            suggestions['pending_updates'] = [
                "Pending Updates: The system has available updates.",
                "Apply system updates (e.g., `apt-get update && apt-get upgrade`) for security/stability.",
                "Schedule regular updates to maintain system reliability.",
                "Review changelogs before applying critical updates.",
                "Consider unattended upgrades for automatic security updates."
            ]

        # Swap Usage
        if swap_usage and len(swap_usage) > 0:
            parts = swap_usage[0].split()
            if len(parts) >= 3:
                try:
                    used_swap = int(parts[2])
                    if used_swap > 0:
                        suggestions['swap_usage'] = [
                            "Swap Usage: This test checks if the system is using swap memory.",
                            "Identify memory-intensive processes and consider adding more RAM.",
                            "Reduce swappiness to rely less on swap.",
                            "Optimize applications or services to reduce memory usage.",
                            "Consider faster storage for swap or increasing RAM for a long-term fix."
                        ]
                except ValueError:
                    pass

        # VPN Status
        if 'vpn_status' in data and not data['vpn_status']:
            suggestions['vpn_status'] = [
                "VPN Status: This test checks if a VPN service is active (if expected).",
                "Ensure VPN services (e.g., OpenVPN) are running.",
                "Check firewall rules for VPN protocols.",
                "Verify VPN configuration files and credentials."
            ]

        # CPU Usage
        if cpu_usage:
            suggestions['cpu_usage'] = [
                "CPU Usage: This test checks CPU load distribution (user, system, idle, etc.).",
                "If CPU usage is high, identify top-consuming processes (`ps aux --sort=-%cpu`).",
                "Optimize application code or consider load balancing.",
                "Add more CPU resources or scale out if consistently high."
            ]

        # Memory Usage
        if memory_usage:
            suggestions['memory_usage'] = [
                "Memory Usage: This test checks how RAM is utilized.",
                "If usage is high, find memory-intensive processes (`ps aux --sort=-%mem`).",
                "Add more RAM or optimize applications.",
                "Monitor memory usage over time with Prometheus/Grafana."
            ]

        # Load Average
        if load_average:
            suggestions['load_average'] = [
                "Load Average: This test provides the average system load over time.",
                "If load is persistently high, check for CPU/I/O bottlenecks.",
                "Distribute workloads or scale out.",
                "Investigate queued processes that drive up load."
            ]

        # If no suggestions at all
        if not suggestions:
            analysis = "No significant issues detected. System appears healthy."

        return analysis, analysis_data, suggestions

    except json.JSONDecodeError as e:
        logging.error(f"Invalid JSON in {file_path}: {e}")
        raise
    except Exception as e:
        logging.error(f"Error analyzing results: {e}")
        raise

@app.route('/diagnostic/upload/<int:case_id>', methods=['POST'])
@jwt_required()
def upload_results(case_id):
    try:
        user_id = get_jwt_identity()
        case = Case.query.get_or_404(case_id)
        claims = get_jwt()
        if case.user_id != user_id and not claims.get("is_admin", False):
            return jsonify({'message': 'Access denied.'}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        timestamp = int(time.time())
        filename = f'case_{case_id}_results_{timestamp}.json'
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        analysis, analysis_data, suggestions = analyze_results(file_path)
        if not isinstance(suggestions, dict):
            suggestions = {}

        case.analysis = analysis
        case.analysis_data = analysis_data
        case.suggestions = suggestions
        db.session.commit()

        return jsonify({'message': 'File uploaded and analysis completed.'}), 200
    except Exception as e:
        app.logger.error(f"Exception in /upload/{case_id}: {e}")
        return jsonify({'message': 'Internal server error'}), 500
        
# Health Check
@app.route('/', methods=['GET'])
def root_index():
    return "OK", 200        

@app.route('/diagnostic/download_script/<int:case_id>', methods=['GET'])
@jwt_required()
def download_script(case_id):
    app.logger.info(f"Downloading script for case_id: {case_id}")
    try:
        user_id = get_jwt_identity()
        case = Case.query.get_or_404(case_id)
        claims = get_jwt()
        if case.user_id != user_id and not claims.get("is_admin", False):
            return jsonify({'message': 'Access denied.'}), 403

        token = request.headers.get('Authorization').split()[1]
        diagnostic_server_url = os.environ.get("DIAGNOSTIC_SERVER_URL", "http://diagnostic.local/diagnostic")
        # Generate the script content from an external file/function
        script_content = generate_diagnostic_script(case_id=case_id, token=token, platform="linux", server_url=diagnostic_server_url)

        response = make_response(script_content)
        response.headers['Content-Type'] = 'text/x-sh'
        response.headers['Content-Disposition'] = f'attachment; filename=diagnostic_script_{case_id}.sh'
        return response

    except Exception as e:
        app.logger.error(f"Exception in /download_script/{case_id}: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
        
@app.route('/metrics')
def metrics():
    return metrics.generate_latest(), 200        

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)

