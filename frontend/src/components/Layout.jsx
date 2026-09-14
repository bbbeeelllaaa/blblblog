import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LeftSidebar from './LeftSidebar';
import HomeHero from './HomeHero';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [effectsEnabled, setEffectsEnabled] = useState(() => localStorage.getItem('ambient-effects') !== 'off');

  const toggleEffects = () => {
    setEffectsEnabled(!effectsEnabled);
    localStorage.setItem('ambient-effects', effectsEnabled ? 'off' : 'on');
  };

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileMenuOpen(false);
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
    <div className={`site-shell min-h-screen flex flex-col ${effectsEnabled ? '' : 'effects-paused'}`}>
      <div className="ambient-scene" aria-hidden="true">
        <div className="ambient-glow glow-one" /><div className="ambient-glow glow-two" /><div className="ambient-glow glow-three" />
        {Array.from({ length: 7 }, (_, i) => <span className="floating-petal" key={i} style={{ '--i': i }} />)}
      </div>
      {/* Navbar */}
      <nav className="site-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="site-logo shrink-0">
              <span className="logo-spark" aria-hidden="true">✧</span>
              <span>{t('nav.brand')}<small>little things, lovely days</small></span>
            </Link>

            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs mx-6">
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-sm"
              />
            </form>

            <div className="hidden lg:flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-brand text-sm">{t('nav.home')}</Link>
              <Link to="/guestbook" className="text-gray-600 hover:text-brand text-sm">{t('nav.guestbook')}</Link>
              {user ? (
                <>
                  {user.is_admin && <Link to="/articles/new" className="btn-primary text-sm">{t('nav.write')}</Link>}
                  <Link to="/favorites" className="text-gray-600 hover:text-brand text-sm">{t('nav.favorites')}</Link>
                  {user.is_admin && <Link to="/admin" className="text-brand hover:text-brand-hover text-sm font-medium">{t('nav.admin')}</Link>}
                  <Link to={`/users/${user.id}`} className="flex items-center gap-2 text-gray-600 hover:text-brand text-sm">
                    <Avatar src={user.avatar} letter={user.username?.[0]?.toUpperCase()} size="w-7 h-7" />
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

              <button type="button" onClick={toggleEffects} className="motion-toggle"
                aria-pressed={effectsEnabled} title={t('journal.toggleEffects')} aria-label={t('journal.toggleEffects')}>
                <span aria-hidden="true">✧</span> {t(effectsEnabled ? 'journal.effectsOn' : 'journal.effectsOff')}
              </button>
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
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-label={t('nav.menu')} aria-expanded={mobileMenuOpen}
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
            <div className="lg:hidden py-4 border-t border-gray-100 space-y-3">
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
                    {user.is_admin && <Link to="/articles/new" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.writeArticle')}</Link>}
                    <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.favorites')}</Link>
                    {user.is_admin && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.adminPanel')}</Link>}
                    <Link to={`/users/${user.id}`} onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.profile')}</Link>
                    <button onClick={handleLogout} className="text-rose py-2 text-left">{t('nav.logout')}</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">{t('nav.login')}</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-brand py-2">{t('nav.register')}</Link>
                  </>
                )}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <button type="button" onClick={toggleEffects} className="motion-toggle" aria-pressed={effectsEnabled}>{t(effectsEnabled ? 'journal.effectsOn' : 'journal.effectsOff')}</button>
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
            <div className="home-hero-container"><HomeHero /></div>
            {/* Mobile sidebar toggle button - hide when sidebar is open */}
            {!mobileSidebarOpen && (
              <div className="md:hidden px-5 mb-4">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="inline-flex items-center gap-2 text-brand text-sm rounded-full border border-brand-light bg-white/80 px-4 py-2"
                  aria-label={t('nav.openSidebar')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  {t('sidebar.about')}
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
            <div className="home-grid">
              <div className="home-sidebar hidden md:block">
                <div className="pb-8">
                  <LeftSidebar />
                </div>
              </div>
              <div className="home-journal min-w-0" id="journal">
                <div className="pb-8">
                  <Outlet />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={`inner-page max-w-4xl mx-auto px-4 py-8 md:py-12 ${/^\/articles\/\d+$/.test(location.pathname) ? 'reading-page' : ''}`}>
            <Outlet />
          </div>
        )}
      </main>

      {/* Footer - only on home page */}
      {isHomePage && (
        <footer className="site-footer">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
            <span className="footer-flower" aria-hidden="true">✧</span>
            <p className="footer-note">{t('journal.footer')}</p>
            {t('footer.text', { year: new Date().getFullYear() })}
          </div>
        </footer>
      )}
    </div>
  );
}
