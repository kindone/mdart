import type { MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  centeredTextY,
  displayLabel,
  fitTextToWidthShared,
  renderWrappedText,
} from '../shared'

export function relationshipItemLabel(item: MdArtItem): { label: string; url: string | null } {
  const { display, url } = displayLabel(item, { value: !!item.value })
  return { label: display, url }
}

export function renderRelationshipBoxText(
  cx: number,
  y: number,
  boxW: number,
  boxH: number,
  item: MdArtItem,
  theme: MdArtTheme,
  weight = '600',
): string {
  const { label } = relationshipItemLabel(item)
  if (!item.value) {
    const fit = fitTextToWidthShared([label], boxW - 12, { maxSize: 11, minSize: 8, maxLines: 3, boxH: boxH - 8 })
    const wrap = fit.results[0]
    const textY = centeredTextY(y, boxH, wrap.lines.length, fit.lineHeight)
    return renderWrappedText(cx, textY, `text-anchor="middle" font-size="${fit.fontSize}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="${weight}"`, label, wrap, fit.lineHeight, item)
  }

  const labelFit = fitTextToWidthShared([label], boxW - 12, { maxSize: 10.5, minSize: 8, maxLines: 1, boxH: 13 })
  const valueFit = fitTextToWidthShared([item.value], boxW - 12, { maxSize: 9.5, minSize: 7.5, maxLines: 2, boxH: boxH - 20 })
  const labelWrap = labelFit.results[0]
  const valueWrap = valueFit.results[0]
  const totalH = labelWrap.lines.length * labelFit.lineHeight + 2 + valueWrap.lines.length * valueFit.lineHeight
  const labelY = y + boxH / 2 - totalH / 2 + labelFit.lineHeight * 0.35
  const valueY = labelY + labelWrap.lines.length * labelFit.lineHeight + 2
  return renderWrappedText(cx, labelY, `text-anchor="middle" font-size="${labelFit.fontSize}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="${weight}"`, label, labelWrap, labelFit.lineHeight, item)
    + renderWrappedText(cx, valueY, `text-anchor="middle" font-size="${valueFit.fontSize}" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`, item.value, valueWrap, valueFit.lineHeight)
}
