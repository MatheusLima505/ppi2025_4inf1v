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
    <div className="top">
      <button className="button" onClick={handleDesafio}>CLICKE EM MIM!!!</button>
      <h3 className="h3">Aperte o botão acima para visualizar a atividade</h3>
    </div>
      {desafio==false ? <MyGrid /> : <MyChaves />}
    </>
  );
}
