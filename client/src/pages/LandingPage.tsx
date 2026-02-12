import { useNavigate } from 'react-router-dom';
import { RealmButton } from '../components/ui/RealmButton';

const CORE_RACES = [
  { name: 'Human', desc: 'Versatile settlers of the Verdant Heartlands, masters of adaptation and diplomacy.' },
  { name: 'Elf', desc: 'Ancient guardians of Silverwood, attuned to arcane magic and the rhythms of nature.' },
  { name: 'Dwarf', desc: 'Ironvault mountain-dwellers, peerless miners and legendary smiths.' },
  { name: 'Halfling', desc: 'Cheerful traders of the Crossroads, welcome in every tavern and marketplace.' },
  { name: 'Orc', desc: 'Fierce warriors of the Ashenfang Wastes, forged by fire and unyielding resolve.' },
  { name: 'Tiefling', desc: 'Shadow-touched outcasts of the Shadowmere Marshes, wielding dark gifts with cunning.' },
  { name: 'Dragonborn', desc: 'Scaled descendants of dragonkind, commanding elemental power from the Frozen Reaches.' },
];

const FEATURES = [
  {
    title: 'Player-Driven Politics',
    desc: 'Elect mayors, pass laws, levy taxes. Every town is governed by its citizens. Rise through the ranks or overthrow the ruling class.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-4 text-realm-gold-400">
        <path d="M12 2L9 8H3l5 4.5L6 20l6-4 6 4-2-7.5L21 8h-6z" />
      </svg>
    ),
  },
  {
    title: 'Strategic Combat',
    desc: 'Choose your battles wisely. Fight bandits on the road, duel rivals for honor, or wage war between kingdoms.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-4 text-realm-gold-400">
        <path d="M14.5 2L18 5.5 7.5 16 4 16 4 12.5z" />
        <path d="M10 6L18 14" />
        <path d="M16 2L22 8" />
      </svg>
    ),
  },
  {
    title: 'Deep Economy',
    desc: '29 professions across gathering, crafting, and services. Mine ore, forge weapons, brew potions, or run a tavern.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-4 text-realm-gold-400">
        <path d="M12 2L10 10H2l6 5-2.5 7L12 17l6.5 5L16 15l6-5h-8z" />
      </svg>
    ),
  },
  {
    title: 'Explore & Travel',
    desc: 'Journey between towns along ancient roads. Discover waypoints, encounter dangers, and trade across regions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-4 text-realm-gold-400">
        <path d="M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4z" />
        <path d="M9 3v14" />
        <path d="M15 7v14" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-realm-bg-900 text-realm-text-primary font-body">
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-realm-bg-900 via-realm-bg-800 to-realm-bg-900">
        <div className="absolute inset-0 bg-realm-vignette pointer-events-none" />
        <div className="relative z-10 text-center">
          <h1 className="font-display text-6xl md:text-8xl text-realm-gold-400 tracking-wider drop-shadow-[0_0_30px_rgba(212,168,67,0.3)]">
            Realm of Crowns
          </h1>

          {/* Gold divider */}
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-realm-gold-500/50" />
            <div className="w-2 h-2 rotate-45 border border-realm-gold-500/50" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-realm-gold-500/50" />
          </div>

          <p className="font-body text-xl md:text-2xl text-realm-text-primary/80 mb-10">
            Forge alliances. Seize power. Rule the realm.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RealmButton variant="primary" size="lg" onClick={() => navigate('/register')}>
              Begin Your Journey
            </RealmButton>
            <RealmButton variant="secondary" size="lg" onClick={() => navigate('/login')}>
              Return to the Realm
            </RealmButton>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-realm-gold-400/60">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section className="py-24 px-6 bg-realm-bg-800 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-realm-text-gold text-center mb-16">
            A Living World Awaits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-realm-bg-700 border border-realm-border rounded-md shadow-realm-panel p-6 text-center bg-realm-panel-gradient"
              >
                {feature.icon}
                <h3 className="font-display text-lg text-realm-gold-400 mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-realm-text-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== World Preview Section ===== */}
      <section className="py-24 px-6 bg-realm-bg-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-realm-text-gold text-center mb-4">
            A Realm of Many Peoples
          </h2>
          <p className="text-center text-realm-text-secondary max-w-2xl mx-auto mb-12">
            20 races across ancient kingdoms. From the dwarven halls of Ironvault to the elven forests
            of Silverwood, each people has their own story — and you'll write yours.
          </p>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            {CORE_RACES.map((race) => (
              <div
                key={race.name}
                className="snap-center shrink-0 w-64 bg-realm-bg-600 border border-realm-border rounded-md p-4 hover:border-realm-border-strong transition-all duration-200"
              >
                <h3 className="font-display text-lg text-realm-gold-400 mb-2">
                  {race.name}
                </h3>
                <p className="text-sm text-realm-text-secondary leading-relaxed">
                  {race.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA Section ===== */}
      <section className="py-24 px-6 bg-realm-bg-800 relative">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl text-realm-gold-400 drop-shadow-[0_0_30px_rgba(212,168,67,0.3)] mb-6">
            Your Crown Awaits
          </h2>
          <p className="text-realm-text-secondary text-lg mb-10">
            Join a world where every decision shapes the realm. Free to play. No downloads. Begin now.
          </p>
          <RealmButton variant="primary" size="lg" onClick={() => navigate('/register')}>
            Create Your Character
          </RealmButton>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="py-8 px-6 bg-realm-bg-900 border-t border-realm-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-display text-realm-gold-400 tracking-wider text-sm">
            Realm of Crowns
          </span>
          <nav className="flex gap-6 text-sm text-realm-text-secondary">
            <a href="#" className="hover:text-realm-gold-400 transition-colors">About</a>
            <a href="#" className="hover:text-realm-gold-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-realm-gold-400 transition-colors">Privacy</a>
          </nav>
          <span className="text-xs text-realm-text-muted">
            &copy; {new Date().getFullYear()} Realm of Crowns. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
