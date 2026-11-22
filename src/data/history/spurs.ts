import { season } from './build';

const C: [string, string] = ['#C4CED4', '#000000'];
const S = (y: number, r: string) => season('sas', 'San Antonio', 'Spurs', y, C, r);

export const spurs = [
  S(1978, `
    George Gervin|SG/SF|93|25|scorer
    Larry Kenon|PF|82|25|big
    James Silas|PG|80|28|scorer
    Billy Paultz|C|78|29|big
    Mike Gale|PG|74|27|defender
    Coby Dietrick|PF|72|29|stretch
    Allan Bristow|SF|72|26|playmaker
  `),
  S(1995, `
    David Robinson|C|97|29|unicorn
    Sean Elliott|SF|82|26|shooter
    Dennis Rodman|PF|84|33|defender
    Avery Johnson|PG|78|29|playmaker
    Vinny Del Negro|SG|75|28|shooter
    Chuck Person|SF|75|30|shooter
    Terry Cummings|PF|76|33|scorer
    J.R. Reid|PF|72|26|big
  `),
  S(1999, `
    Tim Duncan|PF/C|93|22|big
    David Robinson|C|88|33|unicorn
    Sean Elliott|SF|77|30|shooter
    Avery Johnson|PG|77|33|playmaker
    Mario Elie|SG/SF|75|35|wing3d
    Jaren Jackson|SG|72|31|wing3d
    Malik Rose|PF|72|24|defender
    Steve Kerr|PG|72|33|shooter
  `),
  S(2003, `
    Tim Duncan|PF/C|97|26|big
    Tony Parker|PG|84|20|slasher
    Manu Ginóbili|SG|82|25|slasher
    David Robinson|C|82|37|unicorn
    Bruce Bowen|SF|78|31|defender
    Stephen Jackson|SG/SF|77|24|scorer
    Malik Rose|PF|74|28|defender
    Speedy Claxton|PG|72|24|slasher
  `),
  S(2005, `
    Tim Duncan|PF/C|96|28|big
    Manu Ginóbili|SG|88|27|slasher
    Tony Parker|PG|86|22|slasher
    Bruce Bowen|SF|79|33|defender
    Brent Barry|SG|76|33|shooter
    Rasho Nesterović|C|74|28|big
    Nazr Mohammed|C|72|27|big
    Beno Udrih|PG|72|22|scorer
  `),
  S(2007, `
    Tim Duncan|PF/C|94|30|big
    Tony Parker|PG|88|24|slasher
    Manu Ginóbili|SG|87|29|slasher
    Bruce Bowen|SF|78|35|defender
    Michael Finley|SF/SG|75|33|shooter
    Brent Barry|SG|75|35|shooter
    Fabricio Oberto|C|72|31|big
    Francisco Elson|C|70|30|rim
  `),
  S(2014, `
    Tim Duncan|PF/C|87|37|big
    Tony Parker|PG|87|31|slasher
    Kawhi Leonard|SF|86|22|twoway
    Manu Ginóbili|SG|84|36|slasher
    Danny Green|SG/SF|80|26|wing3d
    Boris Diaw|PF|79|31|point
    Tiago Splitter|C|78|29|big
    Patty Mills|PG|77|25|shooter
    Marco Belinelli|SG|76|27|shooter
  `),
  S(2017, `
    Kawhi Leonard|SF|95|25|twoway
    LaMarcus Aldridge|PF|86|31|scorer
    Tony Parker|PG|78|34|slasher
    Danny Green|SG/SF|78|29|wing3d
    Patty Mills|PG|78|28|shooter
    Pau Gasol|C/PF|80|36|point
    Dewayne Dedmon|C|74|27|rim
    Jonathon Simmons|SG|74|27|slasher
  `),
];
