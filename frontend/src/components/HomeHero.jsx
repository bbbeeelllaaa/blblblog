import { useTranslation } from 'react-i18next';
import moonPainting from '../assets/moon-nerine-oil.png';

export default function HomeHero() {
  const { t } = useTranslation();
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <p className="eyebrow"><span /> {t('journal.eyebrow')}</p>
        <h1 id="home-title">{t('journal.title')}<br /><em>{t('journal.titleAccent')}</em></h1>
        <p className="hero-description">{t('journal.description')}</p>
        <a className="hero-link" href="#journal">
          {t('journal.explore')} <span aria-hidden="true">↗</span>
        </a>
        <p className="hero-quote">“The wheel turns, nothing is ever new.” <span>— Sherlock Holmes</span></p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="moon-halo" />
        <img className="moon-painting" src={moonPainting} alt="" width="1280" height="1280" fetchpriority="high" />
        <div className="moon-mist" />
        {Array.from({ length: 7 }, (_, i) => <span className="moon-mote" key={i} style={{ '--i': i }} />)}
        <div className="art-note"><strong>The world is really big.</strong><span>If you don't meet up, you won't see each other again.</span></div>
        <span className="art-caption">a place for little wonders</span>
      </div>
    </section>
  );
}
