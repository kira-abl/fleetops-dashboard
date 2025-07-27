import React, { useState, useEffect } from 'react';

interface Robot {
  id: string;
  status: 'idle' | 'assigned' | 'en_route' | 'delivering' | 'completed';
  currentMissionId: string | null;
  lastUpdated: string;
}

interface Stats {
  totalRobots: number;
  idleRobots: number;
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  cancelledMissions: number;
}

const FleetDashboard: React.FC = () => {
  // State to store robots data
  const [robots, setRobots] = useState<Robot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Function to fetch robots from backend
  const fetchRobots = async () => {
    try {
      const response = await fetch('/api/robots');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const robotsData = await response.json();
      setRobots(robotsData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch robots:', err);
      setError('Failed to fetch robot data');
    }
  };

  // Function to fetch statistics (optional)
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const statsData = await response.json();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Don't show error for stats - it's optional
    }
  };

  // Function to cancel a robot's mission
  const cancelRobotMission = async (robotId: string) => {
    try {
      const response = await fetch(`/api/robots/${robotId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel mission for ${robotId}`);
      }
      
      const result = await response.json();
      console.log('Cancel result:', result);
      
      // Immediately fetch fresh data
      await fetchRobots();
      if (stats) await fetchStats(); // Only fetch stats if we have them
    } catch (err) {
      console.error('Failed to cancel mission:', err);
      setError(`Failed to cancel mission for ${robotId}`);
    }
  };

  // Set up polling to fetch data every 3 seconds
  useEffect(() => {
    // Initial load
    const loadInitialData = async () => {
      setLoading(true);
      await fetchRobots();
      await fetchStats(); // Try to get stats, but don't fail if unavailable
      setLoading(false);
    };
    
    loadInitialData();
    
    // Set up polling interval
    const interval = setInterval(async () => {
      await fetchRobots();
      await fetchStats();
    }, 3000); // Poll every 3 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Get status color for visual indication
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return 'status-idle';
      case 'assigned': return 'status-assigned';
      case 'en_route': return 'status-en-route';
      case 'delivering': return 'status-delivering';
      case 'completed': return 'status-completed';
      default: return 'status-idle';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading robot dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1 className="title">FleetOps Dashboard</h1>
          <p className="subtitle">Real-time monitoring of autonomous delivery robots</p>
          <p className="update-time">Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Statistics Cards - Only show if stats are available */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalRobots}</div>
              <div className="stat-label">Total Robots</div>
            </div>
            <div className="stat-card">
              <div className="stat-number stat-green">{stats.idleRobots}</div>
              <div className="stat-label">Idle Robots</div>
            </div>
            <div className="stat-card">
              <div className="stat-number stat-blue">{stats.activeMissions}</div>
              <div className="stat-label">Active Missions</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.completedMissions}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number stat-red">{stats.cancelledMissions}</div>
              <div className="stat-label">Cancelled</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalMissions}</div>
              <div className="stat-label">Total Missions</div>
            </div>
          </div>
        )}

        {/* Robots Table - This is the main requirement */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">Robot Fleet Status ({robots.length} robots)</h2>
          </div>
          
          <div className="table-wrapper">
            <table className="robots-table">
              <thead>
                <tr>
                  <th>Robot ID</th>
                  <th>Status</th>
                  <th>Current Mission ID</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {robots.map((robot) => (
                  <tr key={robot.id}>
                    <td className="robot-id">{robot.id}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(robot.status)}`}>
                        {robot.status}
                      </span>
                    </td>
                    <td>{robot.currentMissionId || '—'}</td>
                    <td className="last-updated">
                      {new Date(robot.lastUpdated).toLocaleTimeString()}
                    </td>
                    <td>
                      {robot.currentMissionId ? (
                        <button
                          onClick={() => cancelRobotMission(robot.id)}
                          className="cancel-button"
                        >
                          Cancel Mission
                        </button>
                      ) : (
                        <span className="no-mission">No mission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="footer">
          Dashboard updates every 3 seconds • New missions created every minute
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;