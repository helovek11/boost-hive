import { useI18n, translations } from '../lib/i18n';

const Campaigns = () => {
  const { language } = useI18n();
  const t = translations[language];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-20 h-20 bg-hive-amber/10 rounded-2xl flex items-center justify-center border border-hive-amber/20">
        <span className="text-4xl text-hive-amber">🚀</span>
      </div>
      <div>
        <h2 className="text-3xl font-display font-black italic tracking-tight text-white">Campaign Manager</h2>
        <p className="text-white/40 mt-2">Active deployment oversight is being upgraded. Stand by.</p>
      </div>
    </div>
  );
};

export default Campaigns;
