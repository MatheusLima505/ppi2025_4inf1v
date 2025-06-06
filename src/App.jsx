import "./styles/theme.css";
import "./styles/global.css";
import { MyGrid } from "./components/MyGrid";
import { MyChaves } from "./components/MyChaves";
import { useState } from "react";


export default function App() {
  const [desafio, setDesafio] = useState(false) 
  
  function handleDesafio(){
    if (desafio==true){
      setDesafio(false)
    } else {
      setDesafio(true)
    }
    {console.log('chaves')}
  }
  
  return (
    //React Fragment
    <>
      <button onClick={handleDesafio}>Desafio</button>
      {desafio==false ? <MyGrid /> : <MyChaves />}
    </>
  );
}
