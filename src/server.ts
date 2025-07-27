
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
  assignedRobotId: string | null;
  createdAt: Date;
  currentStage: 'preparation' | 'travel' | 'delivery' | 'completed' | 'cancelled';
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
  completed: { duration: 5, robotStatus: 'completed' as const }
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
    if (!mission || mission.currentStage === 'cancelled') return;
    
    const timeInStage = (Date.now() - mission.stageStartTime.getTime()) / 1000;
    const currentStageInfo = missionStages[mission.currentStage];
    
    if (timeInStage >= currentStageInfo.duration) {
      const stages = ['preparation', 'travel', 'delivery', 'completed'];
      const currentIndex = stages.indexOf(mission.currentStage);
      const nextStage = stages[currentIndex + 1];
      
      if (nextStage) {
        // Move to next stage
        mission.currentStage = nextStage as any;
        mission.stageStartTime = new Date();
        const newRobotStatus = missionStages[nextStage as keyof typeof missionStages].robotStatus;
        updateRobot(robot.id, { status: newRobotStatus });
      } else if (mission.currentStage === 'completed') {
        // After completed stage, robot goes idle and mission ends
        updateRobot(robot.id, { status: 'idle', currentMissionId: null });
      }
    }
  });
};

// Cancel mission
const cancelRobotMission = (robotId: string): boolean => {
  const robot = robots[robotId];
  if (!robot || !robot.currentMissionId) return false;
  
  const mission = missions[robot.currentMissionId];
  if (mission) mission.currentStage = 'cancelled';
  
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

// Stats to display on the dashboard
app.get('/api/stats', (req, res) => {
  const missionArray = Object.values(missions);
  res.json({
    totalRobots: Object.keys(robots).length,
    idleRobots: getIdleRobots().length,
    totalMissions: Object.keys(missions).length,
    activeMissions: missionArray.filter(m => m.currentStage !== 'completed' && m.currentStage !== 'cancelled').length,
    completedMissions: missionArray.filter(m => m.currentStage === 'completed').length,
    cancelledMissions: missionArray.filter(m => m.currentStage === 'cancelled').length
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  initializeRobots();
  createNewMissions();
  
  // Start timers
  setInterval(createNewMissions, 60000);
  setInterval(updateRobotStates, 10000);
  
  console.log('Simulation started');
});