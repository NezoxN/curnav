import AppRouter from '@/components/AppRouter';
import AuthInitializer from '@/components/AuthInitializer';

const App = () => {
  return (
    <AuthInitializer>
      <AppRouter />
    </AuthInitializer>
  );
};

export default App;
