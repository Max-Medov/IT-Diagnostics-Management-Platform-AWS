def generate_diagnostic_script(case_id, token, platform="linux", server_url=None):
    # conditions based on platform argument.
    
    SERVER_URL = server_url or "http://diagnostic.local"

    script_content = f'''#!/bin/bash

set -e

CASE_ID={case_id}
TOKEN="{token}"
SERVER_URL="{SERVER_URL}"
TIMESTAMP=$(date +%s)

RESULTS_FILE="case_${{CASE_ID}}_results_${{TIMESTAMP}}.json"
echo "{{" > "$RESULTS_FILE"

read -p "Enter the target machine username: " TARGET_USER
read -p "Enter the target machine IP address: " TARGET_IP

SSH_CONTROL_PATH="/tmp/ssh_control_${{TARGET_USER}}_${{TARGET_IP}}"

# Start the SSH control master session
ssh -o ControlMaster=yes -o ControlPath="$SSH_CONTROL_PATH" -o ControlPersist=5m "$TARGET_USER@$TARGET_IP" "exit"

function run_command() {{
    local cmd="$1"
    ssh -o ControlPath="$SSH_CONTROL_PATH" "$TARGET_USER@$TARGET_IP" "$cmd"
}}

function format_and_append() {{
    local section="$1"
    local output="$2"
    echo "  \\"$section\\": [" >> "$RESULTS_FILE"
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            line=$(echo "$line" | tr -d '\\000-\\037')
            line=$(echo "$line" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
            echo "    \\"$line\\"," >> "$RESULTS_FILE"
        fi
    done <<< "$output"
    sed -i '$ s/,$//' "$RESULTS_FILE"
    echo "  ]," >> "$RESULTS_FILE"
}}

# Run commands and capture outputs
ping_test=$(run_command "ping -c 4 google.com")
dns_resolution=$(run_command "nslookup google.com")
tracepath=$(run_command "tracepath google.com")
network_connections=$(run_command "ss -tuln")
cpu_usage=$(run_command "top -bn1 | grep 'Cpu(s)'")
memory_usage=$(run_command "free -m")
disk_usage=$(run_command "df -h")
running_services=$(run_command "systemctl list-units --type=service --state=running")
network_interfaces=$(run_command "ifconfig -a")
system_uptime=$(run_command "uptime")
load_average=$(run_command "cat /proc/loadavg")
pending_updates=$(run_command "apt list --upgradable")
swap_usage=$(run_command "free -m | grep Swap")
scheduled_tasks=$(run_command "crontab -l; ls /etc/cron.* 2>&1 || true")
vpn_status=$(run_command "systemctl is-active openvpn || echo 'inactive'")

format_and_append "ping_test" "$ping_test"
format_and_append "dns_resolution" "$dns_resolution"
format_and_append "tracepath" "$tracepath"
format_and_append "network_connections" "$network_connections"
format_and_append "cpu_usage" "$cpu_usage"
format_and_append "memory_usage" "$memory_usage"
format_and_append "disk_usage" "$disk_usage"
format_and_append "running_services" "$running_services"
format_and_append "network_interfaces" "$network_interfaces"
format_and_append "system_uptime" "$system_uptime"
format_and_append "load_average" "$load_average"
format_and_append "pending_updates" "$pending_updates"
format_and_append "swap_usage" "$swap_usage"
format_and_append "scheduled_tasks" "$scheduled_tasks"
format_and_append "vpn_status" "$vpn_status"

sed -i '$ s/,$//' "$RESULTS_FILE"
echo "}}" >> "$RESULTS_FILE"

echo "Uploading results..."
curl -f -X POST -H "Authorization: Bearer $TOKEN" -F "file=@$RESULTS_FILE" "{SERVER_URL}/upload/$CASE_ID"

echo "Diagnostic data uploaded successfully."

# Close the SSH control master session
ssh -O exit -o ControlPath="$SSH_CONTROL_PATH" "$TARGET_USER@$TARGET_IP"
'''

    return script_content

