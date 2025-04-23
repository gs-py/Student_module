import { useState } from "react";
import supabase from "./supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiShield } from "react-icons/fi";

// First, import the font
// Remove these lines
// import { Inter } from 'next/font/google';
// const inter = Inter({ subsets: ['latin'] });

// Add this import instead
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data?.user) throw new Error('Login failed');
    } catch (error: any) {
      alert("Login error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex font-poppins">
      {/* Left Section - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=600"
            alt="Campus"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 backdrop-blur-sm" />
        </div>
        <div className="relative z-10 w-full flex flex-col justify-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-white"
          >
            <h1 className="text-5xl font-bold leading-tight">
              Welcome to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                Student Portal
              </span>
            </h1>
            <p className="text-lg text-blue-100 max-w-md">
              Access your academic journey with our comprehensive student management system
            </p>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md">
                <div className="text-3xl font-bold text-blue-200">24/7</div>
                <div className="text-sm text-blue-100">Access Anywhere</div>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md">
                <div className="text-3xl font-bold text-blue-200">100%</div>
                <div className="text-sm text-blue-100">Secure Platform</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 p-8 border border-white/20">
            <div className="flex flex-col items-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                              className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-0.5 mb-4  hover:rotate-6
                 transition-transform duration-300"
              >
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5zm0 0v8"
                    />
                  </svg>
                </div>
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Student Login</h2>
              <p className="text-gray-600">Welcome back, please login to your account</p>
            </div>

            {/* Form section remains the same but with updated styling */}
            <motion.form
              onSubmit={login}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 bg-gray-50 border-gray-200 text-gray-900 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 shadow-xl shadow-blue-500/20"
              >
                {loading ? (
                  <motion.span 
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Authenticating...
                  </motion.span>
                ) : (
                  "Login to Dashboard"
                )}
              </Button>

              <div className="pt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500 rounded-full">
                      Secured Login
                    </span>
                  </div>
                </div>
              </div>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
