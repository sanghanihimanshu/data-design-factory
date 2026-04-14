import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { subscribe, boot, getState } from './store';
import { HomeScreen } from './components/HomeScreen';
import { TopBar } from './components/TopBar';
import { Editor } from './components/Editor';
import './app.css';

export default function App() {
  const [state, setState] = useState(getState);

  useEffect(() => {
    const unsub = subscribe(s => setState({ ...s }));
    boot();
    return unsub;
  }, []);

  const { screen, theme } = state;

  return (
    <div data-theme={theme} style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {screen === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', fontSize: 13, letterSpacing: 2, fontFamily: 'var(--mono)' }}>
          INITIALIZING...
        </div>
      )}
      {screen === 'home' && <HomeScreen projects={state.projects} theme={theme} />}
      {screen === 'editor' && (
        <ReactFlowProvider>
          <TopBar state={state} />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Editor state={state} />
          </div>
        </ReactFlowProvider>
      )}
    </div>
  );
}
