import {multiFactor,TotpMultiFactorGenerator,TotpMultiFactorAssertion} from "firebase/auth";

let pending=null;

export async function startTotpEnrollment(user){
  if(!user)throw new Error("Sign in first.");
  const session=await multiFactor(user).getSession();
  const secret=await TotpMultiFactorGenerator.generateSecret(session);
  pending={secret,user};
  return {secretKey:secret.secretKey,qrUrl:secret.generateQrCodeUrl(user.email||"QR AJN","QR AJN")};
}
export async function finishTotpEnrollment(code,label="Authenticator"){
  if(!pending)throw new Error("Start TOTP enrollment first.");
  const assertion=TotpMultiFactorGenerator.assertionForEnrollment(pending.secret,String(code||"").trim());
  await multiFactor(pending.user).enroll(assertion,label);
  pending=null;return true;
}
export async function listMfa(user){return multiFactor(user).enrolledFactors.map(x=>({uid:x.uid,displayName:x.displayName,factorId:x.factorId,enrollmentTime:x.enrollmentTime}));}
export async function removeMfa(user,uid){await multiFactor(user).unenroll(uid);return true;}
