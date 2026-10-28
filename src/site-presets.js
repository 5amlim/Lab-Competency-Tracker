import {PLATFORMS} from './data.js';

// Site availability, not proof that an individual employee is trained or competent.
// All sites share the same catalog; Beverly Hills Flagship/Satellite additionally have BioFire TORCH.
export const isBeverlyHills = site=>site==='Beverly Hills Flagship'||site==='Beverly Hills Satellite';
export const sitePlatforms = site=>PLATFORMS.filter(platform=>platform.id!=='torch'||isBeverlyHills(site));
export const availablePlatformIds = site=>new Set(sitePlatforms(site).map(item=>item.id));
