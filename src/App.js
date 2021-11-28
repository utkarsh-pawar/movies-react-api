import { Route, Switch } from "react-router";
import Home from "./components/Home";
import MoviePage from "./components/MoviePage";


function App() {
  return (


    <Switch>


      {/* //home component */}
      <Route path='/' exact>
        <Home />
      </Route>
      <Route path='/movies/:id' children={<MoviePage />} >
      </Route>
      {/* //movies component */}

    </Switch>

  );
}

export default App;
