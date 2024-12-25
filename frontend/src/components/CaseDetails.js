import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import caseService from '../api/caseService';
import diagnosticService from '../api/diagnosticService';
import { Container, Typography, Button, Alert, Card, CardContent, Box, Table, TableBody, TableCell, TableRow, TableHead, TextField } from '@mui/material';
import { Line } from 'react-chartjs-2';
import jwt_decode from 'jwt-decode';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function CaseDetails() {
  const [caseData, setCaseData] = useState(null);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const { caseId } = useParams();

  const fetchComments = useCallback(async () => {
    try {
      const response = await caseService.get(`/cases/${caseId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [caseId]);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await caseService.get(`/cases/${caseId}`);
        setCaseData(response.data);

        if (response.data.analysis_data) {
          prepareChartData(response.data.analysis_data);
        }

        await fetchComments();
      } catch (error) {
        setMessage('Error fetching case details.');
        console.error('Error fetching case details:', error);
      }
    };
    fetchCase();
  }, [caseId, fetchComments]);

  const prepareChartData = (analysisData) => {
    if (analysisData.cpu_usage) {
      const cpuUsages = analysisData.cpu_usage
        .map((line) => {
          const match = line.match(/(\d+\.\d+)% id/);
          return match ? 100 - parseFloat(match[1]) : null;
        })
        .filter((value) => value !== null);

      if (cpuUsages.length > 0) {
        const labels = analysisData.timestamps && analysisData.timestamps.length === cpuUsages.length
          ? analysisData.timestamps
          : cpuUsages.map((_, index) => `Point ${index + 1}`);

        const data = {
          labels: labels,
          datasets: [
            {
              label: 'CPU Usage (%)',
              data: cpuUsages,
              fill: false,
              backgroundColor: 'rgb(75, 192, 192)',
              borderColor: 'rgba(75, 192, 192, 0.2)',
            },
          ],
        };
        setChartData(data);
      }
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await diagnosticService.post(`/upload/${caseId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);

      const caseResponse = await caseService.get(`/cases/${caseId}`);
      setCaseData(caseResponse.data);

      if (caseResponse.data.analysis_data) {
        prepareChartData(caseResponse.data.analysis_data);
      }

    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Error uploading file: ${error.response.data.message}`);
        console.error('Error uploading file:', error.response.data.message);
      } else {
        setMessage('Error uploading file: An unexpected error occurred.');
        console.error('Unexpected error uploading file:', error);
      }
    }
  };

  const downloadScript = async () => {
    try {
      const response = await diagnosticService.get(`/download_script/${caseId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diagnostic_script_${caseId}.sh`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      console.log('Diagnostic script downloaded.');
    } catch (error) {
      setMessage('Error downloading script.');
      console.error('Error downloading script:', error);
    }
  };

  const getSuggestionsForTest = (testName) => {
    if (!caseData || !caseData.suggestions) return null;
    return caseData.suggestions[testName] || null;
  };

  const formatCPUUsage = (lines) => {
    const line = lines.find(l => l.includes('Cpu(s):'));
    if (!line) return null;
    const match = line.match(/(\d+\.\d+)\s+us,\s+(\d+\.\d+)\s+sy,\s+(\d+\.\d+)\s+ni,\s+(\d+\.\d+)\s+id,\s+(\d+\.\d+)\s+wa/);
    if (!match) return null;
    return {
      user: match[1],
      system: match[2],
      nice: match[3],
      idle: match[4],
      wait: match[5]
    };
  };

  const formatMemoryUsage = (lines) => {
    const memLine = lines.find(l => l.toLowerCase().startsWith('mem:'));
    const swapLine = lines.find(l => l.toLowerCase().startsWith('swap:'));
    if (!memLine) return null;

    const memParts = memLine.split(/\s+/).filter(Boolean);
    if (memParts.length < 7) return null;

    const memData = {
      total: memParts[1],
      used: memParts[2],
      free: memParts[3],
      shared: memParts[4],
      buffCache: memParts[5],
      available: memParts[6]
    };

    let swapData = null;
    if (swapLine) {
      const swapParts = swapLine.split(/\s+/).filter(Boolean);
      if (swapParts.length >= 4) {
        swapData = {
          total: swapParts[1],
          used: swapParts[2],
          free: swapParts[3]
        };
      }
    }

    return { memData, swapData };
  };

  const formatLoadAverage = (lines) => {
    const line = lines[0];
    if (!line) return null;
    const parts = line.split(/\s+/);
    if (parts.length < 3) return null;

    return {
      load1: parts[0],
      load5: parts[1],
      load15: parts[2]
    };
  };

  const formatTestOutput = (testName, lines) => {
    if (testName === 'cpu_usage') {
      const cpuData = formatCPUUsage(lines);
      if (cpuData) {
        return (
          <Table size="small" style={{ marginBottom: '20px' }}>
            <TableHead>
              <TableRow>
                <TableCell>User %</TableCell>
                <TableCell>System %</TableCell>
                <TableCell>Nice %</TableCell>
                <TableCell>Idle %</TableCell>
                <TableCell>Wait %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{cpuData.user}</TableCell>
                <TableCell>{cpuData.system}</TableCell>
                <TableCell>{cpuData.nice}</TableCell>
                <TableCell>{cpuData.idle}</TableCell>
                <TableCell>{cpuData.wait}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );
      }
    }

    if (testName === 'memory_usage') {
      const memParsed = formatMemoryUsage(lines);
      if (memParsed && memParsed.memData) {
        return (
          <div style={{ marginBottom: '20px' }}>
            <Typography variant="subtitle1"><strong>Memory Usage (MB)</strong></Typography>
            <Table size="small" style={{ marginBottom: '10px' }}>
              <TableHead>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell>Used</TableCell>
                  <TableCell>Free</TableCell>
                  <TableCell>Shared</TableCell>
                  <TableCell>Buff/Cache</TableCell>
                  <TableCell>Available</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{memParsed.memData.total}</TableCell>
                  <TableCell>{memParsed.memData.used}</TableCell>
                  <TableCell>{memParsed.memData.free}</TableCell>
                  <TableCell>{memParsed.memData.shared}</TableCell>
                  <TableCell>{memParsed.memData.buffCache}</TableCell>
                  <TableCell>{memParsed.memData.available}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {memParsed.swapData && (
              <>
                <Typography variant="subtitle1"><strong>Swap (MB)</strong></Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell>Used</TableCell>
                      <TableCell>Free</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{memParsed.swapData.total}</TableCell>
                      <TableCell>{memParsed.swapData.used}</TableCell>
                      <TableCell>{memParsed.swapData.free}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        );
      }
    }

    if (testName === 'load_average') {
      const loadData = formatLoadAverage(lines);
      if (loadData) {
        return (
          <div style={{ marginBottom: '20px' }}>
            <Typography variant="subtitle1"><strong>Load Averages</strong></Typography>
            <Typography>1 min: {loadData.load1}</Typography>
            <Typography>5 min: {loadData.load5}</Typography>
            <Typography>15 min: {loadData.load15}</Typography>
          </div>
        );
      }
    }

    // Default fallback: raw data
    return (
      <Box
        sx={{
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          padding: 2,
          marginBottom: 2,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
        }}
        component="pre"
      >
        {lines.join('\n')}
      </Box>
    );
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setMessage('Please enter a comment.');
      return;
    }

    try {
      const response = await caseService.post(`/cases/${caseId}/comments`, { comment: newComment });
      if (response.status === 201) {
        setMessage('Comment added successfully.');
        setNewComment('');
        await fetchComments();
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Error adding comment: ${error.response.data.message}`);
      } else {
        setMessage('Error adding comment: An unexpected error occurred.');
      }
    }
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '50px' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Case Details
      </Typography>

      {message && (
        <Alert
          severity={message.startsWith('Error') ? 'error' : 'success'}
          style={{ marginBottom: '20px' }}
        >
          {message}
        </Alert>
      )}

      {caseData ? (
        <div>
          <Typography variant="body1">
            <strong>Description:</strong> {caseData.description}
          </Typography>
          <Typography variant="body1">
            <strong>Platform:</strong> {caseData.platform}
          </Typography>
          <Typography variant="body1">
            <strong>Analysis:</strong> {caseData.analysis || 'No analysis available yet.'}
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={downloadScript}
            style={{ marginTop: '20px' }}
          >
            Download Diagnostic Script
          </Button>

          <Typography variant="h6" component="h3" style={{ marginTop: '40px', marginBottom: '10px' }}>
            Upload Diagnostic Results
          </Typography>
          <form onSubmit={handleFileUpload}>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".json,.txt"
              style={{ marginTop: '10px', marginBottom: '10px' }}
            />
            <br />
            <Button variant="contained" color="primary" type="submit">
              Upload
            </Button>
          </form>

          {caseData.analysis_data && (
            <div style={{ marginTop: '40px' }}>
              <Typography variant="h6" component="h3" gutterBottom>
                Test Results and Suggestions
              </Typography>
              {Object.entries(caseData.analysis_data).map(([testName, lines]) => {
                const steps = getSuggestionsForTest(testName);

                let summaryLine = null;
                let suggestionLines = [];

                if (steps && steps.length > 0) {
                  // First line is summary/explanation, rest are suggestions
                  summaryLine = steps[0];
                  suggestionLines = steps.slice(1);
                }

                return (
                  <Card key={testName} style={{ marginBottom: '20px' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {testName.replace('_', ' ').toUpperCase()}
                      </Typography>
                      {formatTestOutput(testName, Array.isArray(lines) ? lines : [])}

                      {steps ? (
                        <Alert severity="info">
                          <Typography variant="subtitle2" gutterBottom><strong>Suggestions:</strong></Typography>
                          {summaryLine && (
                            <Typography variant="body2" gutterBottom>
                              {summaryLine}
                            </Typography>
                          )}
                          {suggestionLines.length > 0 && (
                            <ol style={{ margin: 0, paddingLeft: '20px' }}>
                              {suggestionLines.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                          )}
                        </Alert>
                      ) : (
                        <Alert severity="success">
                          No issues found.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {chartData && (
            <div style={{ marginTop: '40px' }}>
              <Typography variant="h6" component="h3" gutterBottom>
                CPU Usage Chart
              </Typography>
              <Line data={chartData} />
            </div>
          )}

          {/* Comments Section */}
          <div style={{ marginTop: '40px' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Comments
            </Typography>
            {comments.length === 0 ? (
              <Typography>No comments yet.</Typography>
            ) : (
              comments.map(comment => (
                <Card key={comment.id} style={{ marginBottom: '10px' }}>
                  <CardContent>
                    <Typography variant="subtitle2">
                      <strong>{comment.user}{comment.is_admin ? ' (Admin)' : ''}</strong> - {new Date(comment.timestamp).toLocaleString()}
                    </Typography>
                    <Typography variant="body1">{comment.comment}</Typography>
                  </CardContent>
                </Card>
              ))
            )}
            <form onSubmit={handleAddComment} style={{ marginTop: '20px' }}>
              <TextField
                label="Add a comment"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                type="submit"
                style={{ marginTop: '10px' }}
              >
                Post Comment
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <Typography>Loading case details...</Typography>
      )}
    </Container>
  );
}

export default CaseDetails;

