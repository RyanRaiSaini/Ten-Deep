import { season } from './build';

const C: [string, string] = ['#1D428A', '#FFC72C'];
const W = (y: number, r: string, city = 'Golden State') => season('gsw', city, 'Warriors', y, C, r);

export const warriors = [
  W(1962, `
    Wilt Chamberlain|C|98|25|rim
    Paul Arizin|SF|85|33|scorer
    Tom Gola|SG/SF|82|29|twoway
    Guy Rodgers|PG|80|26|playmaker
    Tom Meschery|PF|77|23|big
    Al Attles|SG/PG|76|25|defender
  `, 'Philadelphia'),
  W(1967, `
    Rick Barry|SF|93|22|scorer
    Nate Thurmond|C|88|25|rim
    Jeff Mullins|SG|80|24|scorer
    Tom Meschery|PF|77|28|big
    Al Attles|SG/PG|76|30|defender
    Paul Neumann|PG|74|28|playmaker
    Fred Hetzel|PF|72|24|scorer
  `, 'San Francisco'),
  W(1975, `
    Rick Barry|SF|94|30|scorer
    Jamaal Wilkes|SF|80|21|scorer
    Clifford Ray|C|78|26|rim
    Butch Beard|PG|76|27|playmaker
    Phil Smith|SG|76|22|scorer
    George Johnson|C|74|26|rim
    Charles Johnson|SG|72|26|shooter
    Derrek Dickey|PF|72|23|big
  `),
  W(1991, `
    Chris Mullin|SF|90|27|shooter
    Tim Hardaway|PG|88|24|playmaker
    Mitch Richmond|SG|87|25|scorer
    Šarūnas Marčiulionis|SG|80|26|slasher
    Tyrone Hill|PF|74|23|big
    Tom Tolbert|PF|72|25|stretch
    Rod Higgins|SF|72|31|wing3d
    Alton Lister|C|72|32|rim
  `),
  W(2007, `
    Baron Davis|PG|87|27|slasher
    Stephen Jackson|SF/SG|82|28|scorer
    Monta Ellis|SG|82|21|scorer
    Jason Richardson|SG|81|26|slasher
    Al Harrington|PF|79|27|stretch
    Andris Biedriņš|C|77|20|rim
    Mickaël Piétrus|SF|75|24|wing3d
    Matt Barnes|SF|75|26|twoway
  `),
  W(2015, `
    Stephen Curry|PG|96|26|shooter
    Klay Thompson|SG|88|24|shooter
    Draymond Green|PF|85|24|defender
    Andre Iguodala|SF|80|31|twoway
    Andrew Bogut|C|80|30|rim
    Harrison Barnes|SF/PF|78|22|wing3d
    Shaun Livingston|PG|75|29|playmaker
    David Lee|PF|75|31|big
    Marreese Speights|C|72|27|stretch
  `),
  W(2016, `
    Stephen Curry|PG|99|27|shooter
    Klay Thompson|SG|89|25|shooter
    Draymond Green|PF|89|25|point
    Andre Iguodala|SF|79|32|twoway
    Andrew Bogut|C|78|31|rim
    Harrison Barnes|SF/PF|78|23|wing3d
    Shaun Livingston|PG|75|30|playmaker
    Festus Ezeli|C|72|26|rim
    Leandro Barbosa|SG|72|33|scorer
  `),
  W(2017, `
    Kevin Durant|SF/PF|96|28|scorer
    Stephen Curry|PG|96|28|shooter
    Draymond Green|PF|90|26|defender
    Klay Thompson|SG|89|26|shooter
    Andre Iguodala|SF|78|33|twoway
    Shaun Livingston|PG|75|31|playmaker
    JaVale McGee|C|74|29|rim
    Zaza Pachulia|C|73|32|big
    David West|PF|72|36|big
  `),
  W(2022, `
    Stephen Curry|PG|94|33|shooter
    Draymond Green|PF|86|31|defender
    Andrew Wiggins|SF|82|26|twoway
    Klay Thompson|SG|82|31|shooter|50
    Jordan Poole|SG/PG|81|22|scorer
    Gary Payton II|PG/SG|77|29|defender
    Otto Porter Jr.|SF|76|28|wing3d
    Kevon Looney|C|75|25|big
  `),
];
