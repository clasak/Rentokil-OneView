// Role default preferences for dashboard behavior
(function(){
  window.RoleDefaults = {
    Sales: {
      defaultView: 'charts',
      gridEnabled: true,
      prefs: { unifiedTrackerVisible: false }
    },
    Ops: {
      defaultView: 'numbers',
      gridEnabled: true,
      prefs: { unifiedTrackerVisible: true }
    },
    Manager: {
      defaultView: 'charts',
      gridEnabled: true,
      prefs: { unifiedTrackerVisible: true }
    },
    Executive: {
      defaultView: 'charts',
      gridEnabled: true,
      prefs: { unifiedTrackerVisible: false }
    }
  };
})();
