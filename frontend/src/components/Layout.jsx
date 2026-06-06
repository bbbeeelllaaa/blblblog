import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="text-xl font-bold text-blue-600 shrink-0">
              MyBlog
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-sm"
              />
            </form>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-blue-600 text-sm">Home</Link>
              {user ? (
                <>
                  <Link to="/articles/new" className="btn-primary text-sm">Write</Link>
                  <Link to="/favorites" className="text-gray-600 hover:text-blue-600 text-sm">Favorites</Link>
                  <Link to="/profile" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {user.username}
                  </Link>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 text-sm">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-blue-600 text-sm">Login</Link>
                  <Link to="/register" className="btn-primary text-sm">Register</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 space-y-3">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-sm w-full"
                />
              </form>
              <div className="flex flex-col gap-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">Home</Link>
                {user ? (
                  <>
                    <Link to="/articles/new" onClick={() => setMobileMenuOpen(false)} className="text-blue-600 py-2">Write Article</Link>
                    <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">Favorites</Link>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">Profile</Link>
                    <button onClick={handleLogout} className="text-red-500 py-2 text-left">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">Login</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-blue-600 py-2">Register</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} MyBlog. Built with FastAPI &amp; React.
        </div>
      </footer>
    </div>
  );
}
