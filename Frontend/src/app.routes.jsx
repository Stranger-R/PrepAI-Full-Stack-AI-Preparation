import { createBrowserRouter } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import VerifyEmail from "./features/auth/pages/VerifyEmail";
import Protected from "./features/auth/components/Protected";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";
import MarketJobs from "./features/jobs/pages/MarketJobs";


export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/verify-email",
        element: <VerifyEmail />
    },
    {
        path: "/",
        element: <Protected><Home /></Protected>
    },
    {
        path: "/jobs",
        element: <Protected><MarketJobs /></Protected>
    },
    {
        path:"/interview/:interviewId",
        element: <Protected><Interview /></Protected>
    }
])