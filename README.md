# FleetOps Dashboard

A real-time robot fleet monitoring dashboard built with TypeScript, React, and Node.js. This project simulates autonomous delivery robots in a hospital environment with live status tracking and mission management capabilities.


## Installation & Setup

### Prerequisites
- **Node.js** 16.0 or higher
- **npm** 7.0 or higher  

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fleetops-dashboard.git
   cd fleetops-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```
   This command starts both frontend and backend concurrently.

4. **Access the application**
   - **Frontend Dashboard**: http://localhost:3001
   - **Backend API**: http://localhost:3000/api/robots



## Mission Lifecycle & State Machine

### Robot State Transitions
```
idle → assigned → en_route → delivering → completed → idle
  ↑                                                    ↓
  └────────────────────────────────────────────────────┘
```

### Mission Stages with Timing

| Stage | Duration | Robot Status | Description |
|-------|----------|--------------|-------------|
| **Preparation** | 30 seconds | `assigned` | Robot receives mission details, performs system checks, and plans route |
| **Travel** | 150 seconds | `en_route` | Robot navigates hospital corridors, elevators, and reaches delivery location |
| **Delivery** | 60 seconds | `delivering` | Robot authenticates, hands off items, and receives delivery confirmation |
| **Completed** | 5 seconds | `completed` | Mission marked complete |

*After completion stage finishes, robot automatically returns to `idle` status and becomes available for new missions.*

**Total Minimal Mission Duration**: 235 seconds

### Timing Rationale
- **Preparation (30s)**: Based on assumed robot boot-up and route planning time
- **Travel (150s)**: Assumes 200m average hospital distance at 0.8m/s plus elevator waits
- **Delivery (60s)**: Accounts for authentication, handoff, and confirmation logging
- **Completed (5s)**: Enough time to see the indication  

### Cancel Robot Mission

**What happens immediately:**
- Robot status changes from whatever it was → `idle`
- Robot's `currentMissionId` becomes `null`
- Mission's `currentStage` becomes `cancelled`
- Robot is now available for new missions

**What happens in the next polling cycle (within 10 seconds):**
- `updateRobotStates()` sees the mission stage is `cancelled`
- Skips processing this mission: `if (!mission || mission.currentStage === 'cancelled') return;`
- Robot might get assigned a new mission in `createNewMissions()`

## Development Notes

### Assumptions Made
- **Robot capabilities are similar**: All robots have identical speed and functionality
- **Simplified assignment logic**: First-available robot receives next mission (FIFO)
- **Hospital environment**: 200m delivery distances with elevator access
- **Mission complexity**: All deliveries have similar time requirements

### Tradeoffs
- **Development speed vs. production features**: In-memory storage over using Redis or persistent database for faster development and to follow the instructions
- **Simple assignment vs. optimization**: FIFO robot assignment
- **Fixed timing vs. realistic variability**: Consistent mission durations for demo predictability
- **Polling-based updates vs. time precision**: 10-second state checks for predictable simulation behavior, meaning actual times per stage may be longer (each stage lasts for its defined duration, plus up to 10 seconds until the next poll)

## AWS Deployment Architecture

### AWS Services Breakdown

#### Frontend Hosting
- **Amazon S3** located in the selected **AWS Region**: Static file hosting for React build artifacts
- **CloudFront CDN**: Global content distribution with edge caching (optional)
- **Route 53**: DNS management for custom domain (optional)
- Users access an S3 bucket or a CloudFront distribution address → API call is made to the backend (to the ALB)

#### Backend Infrastructure  
- **Amazon VPC** with two **Availability Zones** for higher availability
- **Application Load Balancer**: Traffic distribution across multiple instances
- **Target Groups**: Define health check endpoints (/api/stats) and routing rules for the ALB to determine which instances are healthy and can receive traffic
- **Auto Scaling Groups**: Automatically scale EC2 instances (2 and more) based on CPU/memory metrics and automatically register/deregister instances with the Target Groups
- One **Public Subnet** and one **Private Subnet** in each AZ
- One **EC2** instance in each Public Subnet to serve as a Bastion Host
- **Private EC2 instances**: ASG manages dockerized Node.js application instances in private subnets
- The ALB routes traffic to healthy instances in the Target Groups via **Routing Tables**
- Developers can SSH into the private EC2 instances via the Bastion Hosts
- **Security Groups**: Network-level firewall rules
- **Amazon ECR**: Docker image repository for storing and versioning the Node.js application images

#### Data Layer
- **Amazon ElastiCache Redis**: Fast shared state management across instances
- **Amazon RDS PostgreSQL**: Persistent storage for mission history and analytics
- **IAM Roles** for EC2 instances to be able to access RDS and ElastiCache.
- The Node.js application communicates with Redis and Postgress using 

### Data Architecture Strategy

#### ElastiCache (Fast Operations)
- Real-time robot status updates
- Active mission state management
- Fast lookups for dashboard queries
- Shared state across multiple backend instances

#### RDS PostgreSQL (Persistent Records)
- Mission history and audit trails
- Robot performance analytics
- Configuration and settings
- Business intelligence and reporting

## Testing Strategy

### Manual Testing Checklist
- [ ] Dashboard loads and displays 100 robots in idle state
- [ ] Missions are created every 60 seconds (2 per cycle)
- [ ] Robot status progresses through all stages correctly
- [ ] Cancel button immediately idles robots
- [ ] Statistics update in real-time
- [ ] Frontend polls backend every 3 seconds
