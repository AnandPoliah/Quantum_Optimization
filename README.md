# Quantum Optimization Routing App

A cutting-edge web application that leverages quantum computing for solving complex routing optimization problems. This application combines quantum algorithms with classical optimization techniques to provide efficient route planning solutions.

## 🚀 Features

### Quantum-Powered Optimization
- **QAOA Algorithm**: Quantum Approximate Optimization Algorithm for solving Traveling Salesman Problem (TSP)
- **Hybrid Approach**: Combines quantum and classical computing for optimal performance
- **Advanced Parameters**: Configurable quantum circuit parameters for different problem sizes

### Multiple Optimization Algorithms
- **Dijkstra**: Classical shortest path algorithm
- **Genetic Algorithm**: Evolutionary optimization approach
- **Simulated Annealing**: Probabilistic optimization technique
- **2-Opt**: Local search improvement heuristic
- **Ant Colony Optimization**: Swarm intelligence-based algorithm

### Interactive Visualization
- **Real-time Maps**: Interactive Leaflet-based maps with custom markers
- **Route Visualization**: Curved road-following routes with directional arrows
- **Depot-based Routing**: Warehouse-centric route planning
- **Multi-stop Optimization**: Efficient handling of complex delivery routes

### Modern Web Architecture
- **React Frontend**: Built with React 18 for responsive user interface
- **FastAPI Backend**: High-performance Python API with async support
- **MongoDB Integration**: Persistent storage for routes and optimization results
- **Real-time Updates**: Live route calculation and visualization

## 🛠️ Technology Stack

### Backend
- **Python 3.9+**
- **FastAPI**: Modern, fast web framework
- **Qiskit**: Quantum computing framework
- **NetworkX**: Graph algorithms and data structures
- **MongoDB**: NoSQL database for data persistence
- **OpenRouteService API**: Real-world road network data

### Frontend
- **React 18**: Modern React with hooks
- **Leaflet**: Interactive maps library
- **Tailwind CSS**: Utility-first CSS framework
- **React Hot Toast**: Elegant notification system

### Development Tools
- **Docker**: Containerized deployment
- **pytest**: Comprehensive testing framework
- **ESLint/Prettier**: Code quality and formatting

## 📋 Prerequisites

- **Python 3.9+**
- **Node.js 18+** and npm/yarn
- **MongoDB** (local or Atlas)
- **OpenRouteService API Key** - Get free key at [openrouteservice.org](https://openrouteservice.org/dev/#/signup)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/AnandPoliah/Quantum_Optimization.git
cd Quantum_Optimization
```

### 2. Backend Setup

**Install Dependencies:**
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

**Configure Environment:**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings:
# MONGO_URL=mongodb://localhost:27017  # or your MongoDB Atlas URL
# MONGO_DB=test_database
# OPENROUTE_API_KEY=your_api_key_here
```

**Setup MongoDB (Local):**
```bash
# Using Docker (Recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB Community Edition from mongodb.com
```

**Start Backend:**
```bash
uvicorn main:app --reload
```

### 3. Frontend Setup

**Install Dependencies:**
```bash
cd frontend
npm install --legacy-peer-deps
# or
yarn install
```

**Start Frontend:**
```bash
npm start
# or
yarn start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)

## 📖 Usage

### Creating Routes
1. **Add Locations**: Click on the map or use "Add Sample Nodes" to create pickup/delivery points
2. **Set Depot**: Click the depot icon on any node to designate it as the starting warehouse
3. **Choose Algorithm**: Select from QAOA (quantum) or classical optimization methods
4. **Optimize**: Click "Optimize Route" to generate the most efficient path

### Algorithm Selection
- **QAOA**: Quantum optimization (best for 3-6 nodes, experimental)
- **Dijkstra**: Fast and reliable shortest path
- **Genetic Algorithm**: Good for complex multi-stop routes
- **Simulated Annealing**: Probabilistic global optimization
- **2-Opt**: Fast local search improvement
- **Ant Colony**: Nature-inspired swarm optimization

### Comparison Mode
- Navigate to **"Compare Algorithms"** page
- Select two different algorithms
- View side-by-side route comparison with metrics

### Visualization Features
- **Curved Routes**: Paths follow actual road networks
- **Direction Arrows**: Clear indicators showing route direction
- **Custom Markers**: Green flag (start), red flag (end), numbered waypoints
- **Distance/Time**: Accurate calculations based on real roads

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 API Endpoints

### Nodes Management
- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/{id}` - Update node
- `DELETE /api/nodes/{id}` - Delete node
- `POST /api/demo/create-sample-nodes` - Create sample data

### Route Optimization
- `POST /api/route/optimize` - Optimize route with specified algorithm
- `POST /api/route/compare` - Compare two algorithms
- `GET /api/route/history` - Get optimization history

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update algorithm parameters

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **IBM Qiskit** for quantum computing framework
- **OpenRouteService** for road network data and routing API
- **React & FastAPI communities** for excellent documentation
- **Leaflet** for interactive mapping capabilities

## 📞 Support

For questions, issues, or contributions:
- 📧 Open an issue on GitHub
- 📖 Check API documentation at `/docs`
- 🧪 Review test suite for usage examples

---

**Built with ⚛️ Quantum Computing & ❤️ for Optimization**