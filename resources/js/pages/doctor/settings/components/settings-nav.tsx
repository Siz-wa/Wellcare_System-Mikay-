import { SettingsTab } from "../settings-data";

export function SettingsNav({ tabs, activeTab, onTabChange }: any) {
  return (
    <aside className="wc-settings-nav">
      {tabs.map((tab: SettingsTab) => {
        // I-assign ang icon sa isang variable na nagsisimula sa capital letter para ma-render bilang component
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`wc-settings-nav-item ${activeTab === tab.id ? 'wc-settings-nav-item--active' : ''}`}
          >
            <span style={{ fontSize: '18px', display: 'flex' }}>
              <Icon />
            </span>
            {tab.label}
          </button>
        );
      })}
    </aside>
  );
}