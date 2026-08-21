import {SAMLAuthProvider,signInWithPopup} from "firebase/auth";
export async function signInEnterpriseSso(auth,providerId){
  const id=String(providerId||"").trim();
  if(!id.startsWith("saml."))throw new Error("Enter the Firebase SAML provider id configured for your organization.");
  return signInWithPopup(auth,new SAMLAuthProvider(id));
}
