const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  const layout = {
    url: "https://tbqoreremmusplbznmfn.supabase.co/storage/v1/object/public/flow-assets/twin-models/1779407160831_LMA_COMPLETA_CHIHUAHUA.fbx",
    name: "LMA COMPLETA CHIHUAHUA",
    type: "fbx",
    storagePath: "twin-models/1779407160831_LMA_COMPLETA_CHIHUAHUA.fbx"
  };

  console.log("Restaurando diseño 'LMA COMPLETA CHIHUAHUA'...");
  
  const { data, error } = await supabase
    .from('flow_designs_beta')
    .insert([{
      name: "LMA COMPLETA CHIHUAHUA",
      description: "Modelo 3D recuperado de la nube (FBX)",
      nodes: [],
      edges: [],
      layout: layout,
      custom_equipments: null
    }])
    .select();

  if (error) {
    console.error("Error al restaurar:", error);
  } else {
    console.log("¡Registro restaurado con éxito!", data);
  }
}

main();
