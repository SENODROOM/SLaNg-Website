import { createFraction, createTerm } from 'slangmath/basic';

export {
  createTerm,
  createFraction,
  differentiateFraction,
  evaluateFraction,
  evaluatePolynomial,
  numericalIntegrateFraction,
  simplifyFraction
} from 'slangmath/basic';

export { latexToSlang, slangToLatex } from 'slangmath/convertor';

export {
  createFunction,
  evaluateFunction,
  extendedSlangToLatex,
  findCriticalPoints,
  gradient,
  hessian,
  tangentPlane
} from 'slangmath/extended';

export {
  parseExpr,
  symDiff,
  symEval,
  symIntegrate,
  symSimplify,
  symToLatex
} from 'slangmath/symbolic';

export { det, solve, trace } from 'slangmath/linalg';
export { rk4 } from 'slangmath/ode';

export function polynomial(coeffs, variable = 'x') {
  const terms = [];
  const degree = coeffs.length - 1;

  for (let i = 0; i < coeffs.length; i += 1) {
    const coeff = coeffs[i];
    const power = degree - i;

    if (coeff === 0) continue;

    terms.push(power === 0 ? createTerm(coeff) : createTerm(coeff, { [variable]: power }));
  }

  return [[createFraction(terms, 1)]];
}
