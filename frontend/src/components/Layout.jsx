import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LeftSidebar from './LeftSidebar';
import toast from 'react-hot-toast';

const scrollCache = {};
let prevPath = null;

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rightPanelRef = useRef(null);
  const leftPanelRef = useRef(null);

  const toggleLanguage = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    localStorage.setItem('lang', next);
    i18n.changeLanguage(next);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  // Save scroll before route change, restore on new route
  useEffect(() => {
    const right = rightPanelRef.current;
    const left = leftPanelRef.current;
    if (right && prevPath && prevPath !== location.pathname) {
      scrollCache[prevPath] = { right: right.scrollTop, left: left?.scrollTop || 0 };
    }
    prevPath = location.pathname;

    const saved = scrollCache[location.pathname];
    if (saved && right) {
      requestAnimationFrame(() => {
        right.scrollTop = saved.right;
        if (left) left.scrollTop = saved.left;
      });
    } else if (right) {
      right.scrollTop = 0;
      if (left) left.scrollTop = 0;
    }
  }, [location.pathname]);

  const isHomePage = location.pathname === '/';
  const showSidebar = isHomePage;

  const handleLogout = () => {
    logout();
    toast.success(t('nav.loggedOut', 'Logged out'));
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
            <Link to="/" className="text-xl font-bold text-brand shrink-0">
              {t('nav.brand')}
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-sm"
              />
            </form>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/" className="text-gray-600 hover:text-brand text-sm">{t('nav.home')}</Link>
              <Link to="/guestbook" className="text-gray-600 hover:text-brand text-sm">{t('nav.guestbook')}</Link>
              {user ? (
                <>
                  <Link to="/articles/new" className="btn-primary text-sm">{t('nav.write')}</Link>
                  <Link to="/favorites" className="text-gray-600 hover:text-brand text-sm">{t('nav.favorites')}</Link>
                  {user.is_admin && <Link to="/admin" className="text-brand hover:text-brand-hover text-sm font-medium">{t('nav.admin')}</Link>}
                  <Link to="/profile" className="flex items-center gap-2 text-gray-600 hover:text-brand text-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-medium">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {user.username}
                  </Link>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-rose text-sm">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-brand text-sm">{t('nav.login')}</Link>
                  <Link to="/register" className="btn-primary text-sm">{t('nav.register')}</Link>
                </>
              )}

              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="ml-2 text-xs font-medium px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors text-gray-600"
                title={t('nav.language')}
              >
                {i18n.language === 'zh-CN' ? 'EN' : '中'}
              </button>
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
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-sm w-full"
                />
              </form>
              <div className="flex flex-col gap-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.home')}</Link>
                <Link to="/guestbook" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.guestbook')}</Link>
                {user ? (
                  <>
                    <Link to="/articles/new" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.writeArticle')}</Link>
                    <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.favorites')}</Link>
                    {user.is_admin && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.adminPanel')}</Link>}
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.profile')}</Link>
                    <button onClick={handleLogout} className="text-rose py-2 text-left">{t('nav.logout')}</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.login')}</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.register')}</Link>
                  </>
                )}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t('nav.language')}:</span>
                  <button
                    onClick={toggleLanguage}
                    className="text-xs font-medium px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
                  >
                    {i18n.language === 'zh-CN' ? 'English' : '中文'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 w-full">
        {showSidebar ? (
          <>
            {/* Mobile sidebar toggle button - hide when sidebar is open */}
            {!mobileSidebarOpen && (
              <div className="md:hidden fixed bottom-4 left-4 z-40">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="w-12 h-12 bg-brand text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-hover transition-colors"
                  aria-label={t('nav.openSidebar')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
                <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-xl overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{t('nav.sidebar')}</span>
                    <button
                      onClick={() => setMobileSidebarOpen(false)}
                      className="p-1 rounded-lg hover:bg-gray-100"
                      aria-label={t('nav.closeSidebar')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <LeftSidebar />
                  </div>
                </div>
              </div>
            )}

            {/* Desktop layout */}
            <div className="flex max-w-7xl mx-auto px-4 py-6" style={{ height: 'calc(100vh - 64px)' }}>
              <div ref={leftPanelRef} className="w-[40%] shrink-0 hidden md:block overflow-y-auto pr-4">
                <div className="pb-8">
                  <LeftSidebar />
                </div>
              </div>
              <div ref={rightPanelRef} className="flex-1 min-w-0 overflow-y-auto md:pl-4">
                <div className="pb-8">
                  <Outlet />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>

      {/* Footer - only on home page */}
      {isHomePage && (
        <footer className="bg-brand-light/20 border-t border-brand-light/40 py-6">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
            {t('footer.text', { year: new Date().getFullYear() })}
          </div>
        </footer>
      )}
    </div>
  );
}
