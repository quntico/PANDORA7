async function main() {
  const url = "https://tbqoreremmusplbznmfn.supabase.co/storage/v1/object/public/flow-assets/twin-models/1779407160831_LMA_COMPLETA_CHIHUAHUA.fbx";
  console.log("Fetching headers for:", url);
  try {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, { method: 'HEAD' });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

main();
