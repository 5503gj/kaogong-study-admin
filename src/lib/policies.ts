// Reviewed static entries are deliberately scoped; there is no live policy search.
const announcement = 'https://www.forestry.gov.cn/c/www/gsgg/645380.jhtml'
const syllabus = 'https://www.forestry.gov.cn/c/www/gsgg/645383.jhtml'
const checkedAt = '2026-10-25'

export function policyAnswer(question: string): string | null {
  const eligibility =
    /年龄|报考条件|报名条件|资格|学历|报名时间|考试时间|报名费|费用|户籍|政审|体检/.test(
      question,
    )
  const exam =
    /考什么|大纲|考试科目|科目分值|多少题|题量|满分/.test(question) ||
    (/模块|科目/.test(question) && /国考|省考/.test(question))
  if (!eligibility && !exam) return null
  const years = [...new Set(question.match(/20\d{2}/g) ?? [])]
  const national2026 =
    years.length === 1 &&
    years[0] === '2026' &&
    /国考|国家公务员/.test(question) &&
    !/省考|联考|事业单位|选调/.test(question)
  if (!national2026) {
    return '请明确考试年度、国考或具体省份以及职位；本站未收录该条件的已核验公告，不沿用其他年度或地区的年龄、学历、科目和题量。请查对应招录机关公告：https://www.scs.gov.cn/ 。'
  }
  if (eligibility) {
    const detail = /年龄/.test(question)
      ? '一般年龄18周岁以上、38周岁以下；2026年应届硕士、博士研究生可放宽至43周岁以下。须逐项核对公告出生时间区间、特殊岗位和其他条件，不能仅凭年龄认定可报考。'
      : '已收录该年度招录公告。学历、专业、应届身份及其他资格应结合职位表和招录机关说明逐项核对；本地助手不自动判断可报考资格，也不套用其他年度的时间或费用。'
    return `【2026年度国考招录公告，核验于${checkedAt}】${detail} 来源：${announcement} 。`
  }
  return `2026年度国考行测包括政治理论、常识判断、言语理解与表达、数量关系、判断推理和资料分析。按试卷类别核对大纲，不能将题量分值固定套用其他年度。来源：${syllabus} （2026年度大纲，核验于${checkedAt}）。`
}
