
import { generateDailyHadith, type DailyHadithOutput } from '@/ai/flows/daily-hadith';
import { getHadithForDate } from '@/app/admin/actions';
import { format } from 'date-fns';
import DailyHadithCard from './daily-hadith-card';


const defaultHadith: DailyHadithOutput = {
    arabic: 'قال النبي صلى الله عليه وسلم: "خياركم أحاسنكم أخلاقاً". - رواه البخاري',
    urdu: 'نبی کریم صلی اللہ علیہ وسلم نے فرمایا، ”تم میں سب سے بہتر وہ ہے جس کے اخلاق سب سے اچھے ہوں۔“ - بخاری',
    english: 'The Prophet (ﷺ) said, "The best among you are those who have the best manners and character." - Bukhari',
    hindi: 'पैगंबर (ﷺ) ने कहा, "तुममें सबसे अच्छे वे हैं जिनके आचरण और चरित्र सबसे अच्छे हैं।" - बुखारी'
};

async function getHadithData(): Promise<DailyHadithOutput> {
    try {
        const dateId = format(new Date(), 'yyyy-MM-dd');
        const customHadith = await getHadithForDate(dateId);

        if (customHadith && Object.values(customHadith).some(h => h)) {
            return customHadith as DailyHadithOutput;
        } else {
            const generatedHadith = await generateDailyHadith();
            return generatedHadith;
        }
    } catch (error) {
        console.error("Error fetching or generating Hadith:", error);
        return defaultHadith;
    }
}


export default async function HadithCardContent() {
    const hadith = await getHadithData();
    return <DailyHadithCard hadith={hadith} />;
}

    