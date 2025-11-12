import { api } from './api.js';

export const createState = (opts = {}) => {
  const { currentUser = null } = opts;

  const state = {
    currentUser,
    date: 'today',
    verticals: JSON.parse(sessionStorage.getItem('rs.verticals') || '[]'),
    anchor: null, // { type: 'appointment'|'me', id, radius }
    appointments: [],
    prospects: [],
    route: { stops: [] },
  };

  const persist = () => {
    sessionStorage.setItem('rs.verticals', JSON.stringify(state.verticals));
  };

  const load = async () => {
    state.appointments = await api.listAppointments(state.date, state.currentUser);
    state.prospects = await api.listProspects(state.verticals, state.currentUser);
    return state;
  };

  const setDate = (date) => { state.date = date; };
  const setVerticals = (arr) => { state.verticals = arr; persist(); };
  const setAnchor = (anchor) => { state.anchor = anchor; };

  const addToRoute = (stop) => { state.route.stops.push(stop); };
  const removeFromRoute = (id) => { state.route.stops = state.route.stops.filter(s => s.id !== id); };

  return { state, load, setDate, setVerticals, setAnchor, addToRoute, removeFromRoute };
};
