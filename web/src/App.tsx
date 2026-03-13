import { Route, Switch, Redirect } from 'wouter';
import { LoginPage } from './pages/LoginPage';
import { AppsPage } from './pages/AppsPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/apps" component={AppsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/">
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

export default App;
