# 📜 CertifyPro — Certificate Management System

A full-stack MERN application for managing student certificates with role-based access control for Students, Faculty, and Admins.

---

## 🚀 Live Demo

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

### Accounts

No demo accounts are preconfigured. Create accounts through the admin dashboard or use the seed scripts with private credentials supplied through environment variables.

---

## ✨ Features

### 🎓 Student
- Login with USN and password
- Upload certificates (images + PDFs up to 5MB)
- Drag and drop file upload with instant preview
- Track verification status (Pending/Approved/Rejected)
- View rejection reasons from faculty
- Filter certificates by status
- View total credits earned from approved certificates
- Delete pending or rejected certificates

### 👨‍🏫 Faculty
- Login with Employee ID and password
- View all students in their department
- Search students by name or USN
- View full student profile with certificate history
- Pending certificates queue (FIFO review order)
- Approve or reject certificates with modal
- Provide rejection reasons for students
- Department-scoped access (can't view other departments)

### ⚙️ Admin
- Login with email and password
- System-wide dashboard with stats
- Department-wise student breakdown
- Certificate status overview
- Add and delete student accounts
- Add and delete faculty accounts
- Toggle student/faculty active/inactive status
- Search and filter all users
- View recent certificate activity

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM for MongoDB |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Multer** | File upload handling |
| **Cloudinary** | Cloud file storage |
| **dotenv** | Environment variables |

### Frontend
| Technology | Purpose |
|---|---|
| **React.js (Vite)** | UI framework |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client |
| **Tailwind CSS** | Styling |
| **React Hot Toast** | Notifications |
| **Context API** | Global state management |

---

## 📁 Project Structure

```text
certificate-management-system/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── cloudinary.js      # Cloudinary setup
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── facultyController.js
│   │   ├── adminController.js
│   │   └── certificateController.js
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── roleMiddleware.js  # Role-based access
│   │   └── uploadMiddleware.js # Multer + Cloudinary
│   ├── models/
│   │   ├── Student.js
│   │   ├── Faculty.js
│   │   ├── Admin.js
│   │   └── Certificate.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── facultyRoutes.js
│   │   ├── adminRoutes.js
│   │   └── certificateRoutes.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── seedAdmin.js
│   │   ├── seedStudent.js
│   │   └── seedFaculty.js
│   ├── .env                   # Environment variables
│   ├── .env.example           # Environment template
│   └── server.js              # Entry point
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js       # Axios instance + interceptors
    │   ├── components/
    │   │   ├── AuthLayout.jsx
    │   │   ├── CertificateCard.jsx
    │   │   ├── Loader.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── StatsCard.jsx
    │   │   └── VerifyModal.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── auth/
    │   │   │   ├── StudentLogin.jsx
    │   │   │   ├── FacultyLogin.jsx
    │   │   │   └── AdminLogin.jsx
    │   │   ├── student/
    │   │   │   ├── StudentDashboard.jsx
    │   │   │   └── UploadCertificate.jsx
    │   │   ├── faculty/
    │   │   │   ├── FacultyDashboard.jsx
    │   │   │   └── StudentProfile.jsx
    │   │   └── admin/
    │   │       └── AdminDashboard.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env
    ├── .env.example
    └── tailwind.config.js
    ⚙️ Setup & InstallationPrerequisitesNode.js v18+MongoDB Atlas account (free tier works)Cloudinary account (free tier works)1. Clone the repositoryBashgit clone [https://github.com/yourusername/certificate-management-system.git](https://github.com/yourusername/certificate-management-system.git)
cd certificate-management-system
2. Backend SetupBashcd backend
npm install
cp .env.example .env
# Fill in your values in .env

npm run seed:all    # Creates demo admin, student, faculty
npm run dev         # Starts on port 5000
3. Frontend SetupBashcd ../frontend
npm install
cp .env.example .env
# .env already has the correct local URL

npm run dev         # Starts on port 5173
4. Open the appNavigate to http://localhost:5173 in your browser.🔐 API ReferenceAuth EndpointsHTTPPOST /api/auth/student/login    { usn, password }
POST /api/auth/faculty/login    { employeeId, password }
POST /api/auth/admin/login      { email, password }
GET  /api/auth/me               → current user (requires token)
Certificate EndpointsHTTPPOST   /api/certificate/upload  → upload (student)
GET    /api/certificate/my      → own certs (student)
GET    /api/certificate/stats   → own stats (student)
DELETE /api/certificate/:id     → delete (student)
GET    /api/certificate/all     → all certs (faculty, admin)
GET    /api/certificate/:id     → single cert (all roles)
Faculty EndpointsHTTPGET /api/faculty/dashboard          → stats + recent
GET /api/faculty/students           → dept students
GET /api/faculty/pending            → pending queue
GET /api/faculty/student/:id        → student profile
PUT /api/faculty/verify/:certId     → approve/reject
Admin EndpointsHTTPGET    /api/admin/dashboard         → system stats
GET    /api/admin/students          → all students
POST   /api/admin/student           → add student
DELETE /api/admin/student/:id       → delete student
PUT    /api/admin/student/:id/toggle → toggle status
GET    /api/admin/faculty           → all faculty
POST   /api/admin/faculty           → add faculty
DELETE /api/admin/faculty/:id       → delete faculty
PUT    /api/admin/faculty/:id/toggle → toggle status
🚢 Deployment GuideBackend → Render.com (Free)Push your code to GitHub.Go to render.com and create a New Web Service.Connect your GitHub repository.Configure the build settings:Root Directory: backendBuild Command: npm installStart Command: npm startAdd Environment Variables (from your local .env):MONGO_URIJWT_SECRETJWT_EXPIRECLOUDINARY_CLOUD_NAMECLOUDINARY_API_KEYCLOUDINARY_API_SECRETNODE_ENV = productionDeploy and copy your generated production API live URL (e.g., https://certify-api.onrender.com).Frontend → Vercel (Free)Go to vercel.com and create a New Project.Import your GitHub repository.Configure the build settings:Root Directory: frontendFramework Preset: ViteBuild Command: npm run buildOutput Directory: distAdd the following Environment Variable:VITE_API_BASE_URL = https://certify-api.onrender.com/apiClick Deploy!Update CORS for ProductionMake sure your backend configures cross-origin updates appropriately inside backend/server.js:JavaScriptapp.use(cors({
  origin: [
    "http://localhost:5173",           // Development
    "[https://your-app.vercel.app](https://your-app.vercel.app)",     // Production (Your Vercel URL)
  ],
  credentials: true,
}));
🔒 Security FeaturesPasswords safely hashed with bcrypt (salt rounds: 10).State-preserving stateless JWT tokens expiring after 7 days.Strict select: false optimization on schema field passwords.Strict route protection via granular role-based access control (RBAC) middlewares.Department-scoped structural filters matching faculty to their respective domains.Safety locking mechanisms ensuring approved certificates cannot be mutated or deleted.Validation checks mapping payload file sizes ($< \text{5MB}$) and valid file signatures on uploads.Centralized Axios token ejection interceptors auto-clearing global state on unexpected 401 states.Structural account security blocking deactivated entities on initial login pipeline.🤝 ContributingPull requests are welcome! For major architectural refactors, please open an issue first to discuss what you'd like to change.📄 LicenseMIT License — free to use for learning, assignments, and portfolio hackathons.
