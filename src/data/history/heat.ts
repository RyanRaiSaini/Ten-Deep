import { season } from './build';

const C: [string, string] = ['#98002E', '#F9A01B'];
const H = (y: number, r: string) => season('mia', 'Miami', 'Heat', y, C, r);

export const heat = [
  H(1997, `
    Alonzo Mourning|C|90|27|rim
    Tim Hardaway|PG|89|30|playmaker
    Jamal Mashburn|SF|80|24|scorer
    P.J. Brown|PF/C|79|27|defender
    Voshon Lenard|SG|77|24|shooter
    Dan Majerle|SF/SG|77|31|wing3d
    Isaac Austin|C|75|27|big
    Keith Askins|SF|70|29|defender
  `),
  H(2005, `
    Shaquille O'Neal|C|92|32|rim
    Dwyane Wade|SG|91|23|slasher
    Eddie Jones|SG/SF|80|33|wing3d
    Udonis Haslem|PF|75|24|big
    Damon Jones|PG|74|28|shooter
    Keyon Dooling|PG|70|24|scorer
    Rasual Butler|SF|70|25|shooter
  `),
  H(2006, `
    Dwyane Wade|SG|93|24|slasher
    Shaquille O'Neal|C|89|33|rim
    Alonzo Mourning|C|80|35|rim
    Antoine Walker|PF|79|29|point
    Jason Williams|PG|78|30|playmaker
    Gary Payton|PG|77|37|defender
    James Posey|SF|77|29|wing3d
    Udonis Haslem|PF|76|25|big
    Jason Kapono|SF|72|24|shooter
  `),
  H(2009, `
    Dwyane Wade|SG|96|27|scorer
    Michael Beasley|PF|77|20|scorer
    Jermaine O'Neal|C/PF|75|30|rim|40
    Udonis Haslem|PF|76|28|big
    Mario Chalmers|PG|74|22|defender
    Daequan Cook|SG|72|21|shooter
  `),
  H(2012, `
    LeBron James|SF/PF|98|27|point
    Dwyane Wade|SG|91|30|slasher
    Chris Bosh|PF/C|86|27|stretch
    Shane Battier|SF|76|33|wing3d
    Mario Chalmers|PG|76|25|defender
    Udonis Haslem|PF|75|31|big
    Mike Miller|SF|73|32|shooter
    Joel Anthony|C|72|29|rim
  `),
  H(2013, `
    LeBron James|SF/PF|99|28|point
    Dwyane Wade|SG|88|31|slasher
    Chris Bosh|PF/C|86|28|stretch
    Ray Allen|SG|78|37|shooter
    Mario Chalmers|PG|77|26|defender
    Chris Andersen|C|76|34|rim
    Shane Battier|SF|76|34|wing3d
    Norris Cole|PG|72|24|defender
  `),
  H(2020, `
    Jimmy Butler|SF|89|30|twoway
    Bam Adebayo|C/PF|86|22|twoway
    Goran Dragić|PG|82|33|scorer
    Duncan Robinson|SF|79|25|shooter
    Jae Crowder|PF|77|29|wing3d
    Kendrick Nunn|PG|76|24|scorer
    Andre Iguodala|SF|75|36|twoway
    Kelly Olynyk|C/PF|75|28|stretch
  `),
  H(2023, `
    Jimmy Butler|SF|91|33|twoway
    Bam Adebayo|C/PF|87|25|twoway
    Tyler Herro|SG|83|23|scorer
    Kyle Lowry|PG|78|36|playmaker
    Max Strus|SF/SG|77|26|shooter
    Caleb Martin|SF|77|27|defender
    Gabe Vincent|PG|76|26|defender
    Kevin Love|PF|74|34|stretch
  `),
];
