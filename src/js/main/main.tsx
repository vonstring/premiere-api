import { useEffect } from "react";
import { startServer } from "../server";

let server: any;

const Main = () => {
  useEffect(() => { 
    
    if (window.cep && !server) {
      server = startServer(8599);
      if (import.meta.hot) {
        import.meta.hot.on('vite:beforeUpdate', () => {
          server.close();
        })
      }
      window.onunload = () => {
        server.close();
      }
    }
  }, []);
  return (
    <div>
      <input type="file" />
    </div>
  );
};
export default Main;