import { SandboxClient } from './SandboxClient';

import { Logger } from '@/utils/logger';
export function exposeSandboxToWindow(): void {
  // Dev-only helper so you can test quickly from the browser console:
  //   await window.__whSandbox.run(`const r = await api.addUser({email:"a@b.com",name:"Ada"}); return r;`)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const w = window as any;
  if (w.__whSandbox) return;
  w.__whSandbox = new SandboxClient();
  Logger.info('ui', 
    '[Sandbox] Dev helper ready: window.__whSandbox.run(code). Example:',
    'await window.__whSandbox.run(`const r = await api.addUser({ email: "a@b.com", name: "Ada" }); return r;`)'
  );
}

