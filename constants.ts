
import { Department, Course } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'cpe', name: 'Computer Engineering' },
  { id: 'ele', name: 'Electrical Engineering' },
  { id: 'mec', name: 'Mechanical Engineering' },
  { id: 'civ', name: 'Civil Engineering' },
  { id: 'che', name: 'Chemical Engineering' },
];

export const COURSES: Course[] = [
  { id: 'cpe301', code: 'CPE 301', name: 'Digital Logic Design', deptId: 'cpe' },
  { id: 'cpe305', code: 'CPE 305', name: 'Computer Architecture', deptId: 'cpe' },
  { id: 'ele201', code: 'ELE 201', name: 'Circuit Theory I', deptId: 'ele' },
  { id: 'ele401', code: 'ELE 401', name: 'Control Engineering', deptId: 'ele' },
  { id: 'mec201', code: 'MEC 201', name: 'Engineering Thermodynamics', deptId: 'mec' },
  { id: 'civ301', code: 'CIV 301', name: 'Structural Analysis', deptId: 'civ' },
];

export const LEVELS = ['100', '200', '300', '400', '500'];

export const GEOCONFIG = {
  DEFAULT_RADIUS: 100, // meters
};
