import { season } from './build';

const C: [string, string] = ['#C8102E', '#1D42BA'];
const D = (y: number, r: string) => season('det', 'Detroit', 'Pistons', y, C, r);

export const pistons = [
  D(1968, `
    Dave Bing|SG|88|24|scorer
    Dave DeBusschere|PF|84|27|defender
    Happy Hairston|PF|78|25|big
    Eddie Miles|SG|76|27|scorer
    Terry Dischinger|SF|76|27|scorer
    Jimmy Walker|PG|74|23|playmaker
  `),
  D(1974, `
    Bob Lanier|C|90|25|big
    Dave Bing|SG/PG|86|30|playmaker
    Curtis Rowe|SF|76|24|scorer
    Don Adams|SF|74|26|defender
    Chris Ford|SG|74|24|defender
    Stu Lantz|SG|72|27|shooter
  `),
  D(1989, `
    Isiah Thomas|PG|93|27|playmaker
    Joe Dumars|SG|87|25|twoway
    Bill Laimbeer|C|84|31|stretch
    Dennis Rodman|PF|83|27|defender
    Mark Aguirre|SF|82|29|scorer
    Vinnie Johnson|SG|80|32|scorer
    Rick Mahorn|PF|77|30|defender
    James Edwards|C|76|33|big
    John Salley|PF/C|75|24|rim
  `),
  D(1990, `
    Isiah Thomas|PG|92|28|playmaker
    Joe Dumars|SG|88|26|twoway
    Dennis Rodman|PF|85|28|defender
    Bill Laimbeer|C|83|32|stretch
    Mark Aguirre|SF|80|30|scorer
    Vinnie Johnson|SG|79|33|scorer
    James Edwards|C|77|34|big
    John Salley|PF/C|75|25|rim
  `),
  D(2004, `
    Ben Wallace|C|89|29|defender
    Chauncey Billups|PG|87|27|twoway
    Rasheed Wallace|PF|86|29|stretch
    Richard Hamilton|SG|84|26|scorer
    Tayshaun Prince|SF|80|23|defender
    Mehmet Okur|C|76|24|stretch
    Corliss Williamson|PF|74|30|scorer
  `),
  D(2006, `
    Chauncey Billups|PG|90|29|twoway
    Ben Wallace|C|88|31|defender
    Rasheed Wallace|PF|85|31|stretch
    Richard Hamilton|SG|85|27|scorer
    Tayshaun Prince|SF|81|25|defender
    Antonio McDyess|PF|77|31|big
    Carlos Arroyo|PG|70|26|playmaker
  `),
  D(2008, `
    Chauncey Billups|PG|85|31|twoway
    Richard Hamilton|SG|83|29|scorer
    Rasheed Wallace|PF|82|33|stretch
    Tayshaun Prince|SF|80|27|defender
    Antonio McDyess|PF|76|33|big
    Rodney Stuckey|SG|75|21|slasher
    Jason Maxiell|PF|72|24|rim
    Jarvis Hayes|SF|70|26|shooter
  `),
];
