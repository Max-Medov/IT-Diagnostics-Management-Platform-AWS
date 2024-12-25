# IT-Diagnostics-Management-Platform

Overview -
The IT Diagnostics Management Platform streamlines troubleshooting and system optimization by automating diagnostics and providing actionable insights. At its core, the platform uses a script that connects to target devices, executes predefined commands, collects output data, and automatically uploads it to the backend for analysis. With a focus on network diagnostics alongside storage and performance checks, it helps IT professionals quickly identify and resolve issues, improving system efficiency and reliability.

Key Objectives
1.	Simplify Troubleshooting: Automate diagnostic tasks to save time and minimize errors.
2.	Enhance Network Performance: Detect and resolve connectivity, configuration, and performance issues.
3.	Comprehensive Insights: Deliver actionable recommendations for system optimization.
________________________________________
How It Works
1.	User Registration and Case Creation:
o	Users register, log in, and create diagnostic cases with unique Case IDs, describing their system issue and platform.
2.	Script Download and Execution:
o	The platform provides a tailored diagnostic script.
o	The script connects to the device via SSH, executes diagnostic commands, and collects metrics, including: 
	Network Diagnostics: Ping, traceroute, interface details, packet loss, and latency.
	Storage Checks: Disk usage, file system health, and block device analysis.
	Performance Metrics: CPU load, memory usage, and process efficiency.
o	Results are packaged into a single file and automatically uploaded to AWS S3, with the file path stored in the backend database.
3.	Analysis and Recommendations:
o	The backend processes the uploaded results, identifies issues, and provides detailed reports accessible through the frontend.

________________________________________
Technologies
1.	Frontend: React for a responsive and user-friendly interface.
2.	Backend: Flask microservices to manage users, cases, and diagnostics.
3.	Database: PostgreSQL to store user data, diagnostic metadata, and S3 file paths.
4.	Monitoring (An option): 
o	Grafana: Dashboards for visualizing diagnostic trends.
o	Prometheus: Real-time metrics collection and alerting.
5.	Orchestration: 
o	Docker for containers.
o	Kubernetes (Minikube for local testing, AWS EKS for production).
6.	Infrastructure Automation: Terraform for provisioning.
7.	Storage: AWS S3 for secure result storage.
8.	CI/CD: Jenkins for automated deployments.

________________________________________
Diagnostic Focus
1.	Network Diagnostics: Connectivity checks, packet loss, latency, and routing analysis.
2.	Storage Checks: Disk usage and file system integrity monitoring.
3.	Performance Metrics: Identifying CPU and memory bottlenecks.
________________________________________
Future Enhancements
1.	Expanded Device Support: Add diagnostics for Cisco, FortiGate, and F5 devices.
2.	Proactive Maintenance: Use AI-driven analytics for predicting and preventing failures.
________________________________________
Demo Workflow
1.	Create a Case: Register, log in, and create a diagnostic case.
2.	Run Diagnostics: Download and execute a tailored script that connects to the device, runs diagnostics, and uploads results to the backend.
3.	Upload Results: The script automatically sends diagnostic results to AWS S3, and the backend stores the file path.
4.	View Insights: Access detailed analysis and recommendations via the frontend.
