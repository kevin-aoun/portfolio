// Kevin's tree mark, from his deckify brand kit (assets/logo/tree-mark-corrected.svg), as a filled path.
export const MARK_VIEWBOX = [160, 68, 950, 1092];
// The original mark, kept to switch back to (and in dev/favicon-original.svg for the favicon):
export const MARK_PATH_ORIGINAL = 'M 613.1 343.0 A 140 140 0 1 1 739.3 343.6 L 739.3 501.0 L 941.5 296.9 L 1018.6 372.9 L 808.5 586.1 L 1100.0 585.4 L 1099.9 704.7 L 805.0 705.2 L 1004.5 913.3 L 933.5 984.4 L 735.5 786.4 L 735.0 1148.0 Q 678.5 1158.0 622.0 1148.0 C 622.0 702.0 347.0 702.0 174.3 702.0 L 174.4 586.2 L 542.0 585.7 L 330.5 373.3 L 406.7 298.6 L 613.1 504.4 Z';
// The fatter mark (2026-11-05): branches 1.3x as thick and 10% shorter, the trunk's foot and the
// left branch 18% shorter (equal again, as in the original), trunk 1.2x,
// head radius 145; same geometry otherwise. To go back, set MARK_PATH = MARK_PATH_ORIGINAL and restore the
// favicon from dev/.
export const MARK_PATH = 'M 600.5 347.3 A 145 145 0 1 1 751.9 347.3 L 751.9 462.7 L 899.5 315.1 L 999.8 415.4 L 847.4 567.8 L 1057.6 567.8 L 1057.6 722.8 L 840.6 722.8 L 988.5 870.7 L 890.5 968.7 L 751.9 830.1 L 751.9 1057.5 Q 676.2 1067.514 600.5 1057.514 C 600.5 722.8 406.2 722.8 264.6 722.8 L 264.6 567.8 L 501.3 567.8 L 349.8 416.3 L 448.9 317.2 L 600.5 468.8 Z';
