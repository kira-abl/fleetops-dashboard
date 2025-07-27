// src/server.ts - Using Objects Instead of Maps
import express from 'express';
import cors from 'cors';

// Types
interface Robot {
  id: string;
  status: 'idle' | 'assigned' | 'en_route' | 'delivering' | 'completed';
  currentMissionId: string | null;
  lastUpdated: Date;
}

interface Mission {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedRobotId: string | null;
  createdAt: Date;
  currentStage: 'preparation' | 'travel' | 'delivery' | 'completed';
  stageStartTime: Date;
}

// In-memory storage using objects
let robots: { [key: string]: Robot } = {};
let missions: { [key: string]: Mission } = {};

// Mission stages with timing
const missionStages = {
  preparation: { duration: 30, robotStatus: 'assigned' as const },
  travel: { duration: 150, robotStatus: 'en_route' as const },
  delivery: { duration: 60, robotStatus: 'delivering' as const },
  completed: { duration: 0, robotStatus: 'idle' as const }
};

// Initialize robots
const initializeRobots = (): void => {
  // Clear existing robots
  robots = {};
  
  for (let i = 1; i <= 100; i++) {
    const robotId = `robot-${i}`;
    robots[robotId] = {
      id: robotId,
      status: 'idle',
      currentMissionId: null,
      lastUpdated: new Date()
    };
  }
  console.log(`Initialized ${Object.keys(robots).length} robots`);
};

// Helper functions
const getAllRobots = (): Robot[] => Object.values(robots);

const getIdleRobots = (): Robot[] => 
  getAllRobots().filter(robot => robot.status === 'idle');

const updateRobot = (id: string, updates: Partial<Robot>): Robot | null => {
  const robot = robots[id];
  if (!robot) return null;
  
  const updatedRobot = { ...robot, ...updates, lastUpdated: new Date() };
  robots[id] = updatedRobot;
  return updatedRobot;
};

// Create missions
const createNewMissions = (): void => {
  const idleRobots = getIdleRobots();
  const missionsToCreate = Math.min(2, idleRobots.length);
  
  for (let i = 0; i < missionsToCreate; i++) {
    const missionId = `mission-${Date.now()}-${i}`;
    const robot = idleRobots[i];
    
    const mission: Mission = {
      id: missionId,
      status: 'in_progress',
      assignedRobotId: robot.id,
      createdAt: new Date(),
      currentStage: 'preparation',
      stageStartTime: new Date()
    };
    
    missions[missionId] = mission;
    updateRobot(robot.id, { status: 'assigned', currentMissionId: missionId });
  }
};

// Update robot states
const updateRobotStates = (): void => {
  getAllRobots().forEach(robot => {
    if (!robot.currentMissionId) return;
    
    const mission = missions[robot.currentMissionId];
    if (!mission || mission.currentStage === 'completed') return;
    
    const timeInStage = (Date.now() - mission.stageStartTime.getTime()) / 1000;
    const currentStageInfo = missionStages[mission.currentStage];
    
    if (timeInStage >= currentStageInfo.duration) {
      const stages = ['preparation', 'travel', 'delivery', 'completed'];
      const nextStage = stages[stages.indexOf(mission.currentStage) + 1] || 'completed';
      
      mission.currentStage = nextStage as any;
      mission.stageStartTime = new Date();
      
      if (nextStage === 'completed') {
        mission.status = 'completed';
        updateRobot(robot.id, { status: 'idle', currentMissionId: null });
      } else {
        const newRobotStatus = missionStages[nextStage as keyof typeof missionStages].robotStatus;
        updateRobot(robot.id, { status: newRobotStatus });
      }
    }
  });
};

// Cancel mission
const cancelRobotMission = (robotId: string): boolean => {
  const robot = robots[robotId];
  if (!robot || !robot.currentMissionId) return false;
  
  const mission = missions[robot.currentMissionId];
  if (mission) mission.status = 'cancelled';
  
  updateRobot(robotId, { status: 'idle', currentMissionId: null });
  return true;
};

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Get all robots
app.get('/api/robots', (req, res) => {
  res.json(getAllRobots());
});

// Cancel robot mission  
app.post('/api/robots/:id/cancel', (req, res) => {
  const success = cancelRobotMission(req.params.id);
  res.json({ success });
});

// Stats for dashboard cards
app.get('/api/stats', (req, res) => {
  const missionArray = Object.values(missions);
  res.json({
    totalRobots: Object.keys(robots).length,
    idleRobots: getIdleRobots().length,
    totalMissions: Object.keys(missions).length,
    activeMissions: missionArray.filter(m => m.status === 'in_progress').length,
    completedMissions: missionArray.filter(m => m.status === 'completed').length,
    cancelledMissions: missionArray.filter(m => m.status === 'cancelled').length
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  initializeRobots();
  
  // Start timers
  setInterval(createNewMissions, 60000);  // Every minute
  setInterval(updateRobotStates, 10000);  // Every 10 seconds
  
  console.log('Simulation started');
});